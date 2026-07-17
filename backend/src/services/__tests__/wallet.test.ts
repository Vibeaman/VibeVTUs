/**
 * Wallet Service Unit Tests
 * 
 * Tests cover:
 * 1. Debiting more than available balance (should fail, no partial state changes)
 * 2. Concurrent debit requests (should not allow double-spending)
 * 3. Credit and debit both succeeding with correct transaction records
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Test configuration - these would typically come from environment variables
const TEST_CONFIG = {
  supabaseUrl: process.env.TEST_SUPABASE_URL || 'https://tpopcfdarstozljjttcc.supabase.co',
  supabaseServiceKey: process.env.TEST_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY,
};

describe('Wallet Service', () => {
  let supabase: SupabaseClient;
  let testUserId: string;
  let testUserId2: string;

  beforeAll(async () => {
    if (!TEST_CONFIG.supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_KEY is required for tests');
    }
    
    supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create test users
    const timestamp = Date.now();
    const email1 = `test_user_1_${timestamp}@test.com`;
    const email2 = `test_user_2_${timestamp}@test.com`;

    const { data: user1 } = await supabase.auth.admin.createUser({
      email: email1,
      email_confirm: true,
    });

    const { data: user2 } = await supabase.auth.admin.createUser({
      email: email2,
      email_confirm: true,
    });

    testUserId = user1?.user?.id || '';
    testUserId2 = user2?.user?.id || '';

    // Ensure wallets exist
    await supabase.from('wallets').upsert({ user_id: testUserId, balance: 1000 });
    await supabase.from('wallets').upsert({ user_id: testUserId2, balance: 1000 });
  });

  afterAll(async () => {
    // Cleanup test users and their data
    if (testUserId) {
      await supabase.from('transactions').delete().eq('user_id', testUserId);
      await supabase.from('wallets').delete().eq('user_id', testUserId);
      await supabase.auth.admin.deleteUser(testUserId);
    }
    if (testUserId2) {
      await supabase.from('transactions').delete().eq('user_id', testUserId2);
      await supabase.from('wallets').delete().eq('user_id', testUserId2);
      await supabase.auth.admin.deleteUser(testUserId2);
    }
  });

  beforeEach(async () => {
    // Reset wallet balances before each test
    await supabase.from('wallets').upsert({ user_id: testUserId, balance: 1000 });
    await supabase.from('transactions').delete().eq('user_id', testUserId);
  });

  // ==========================================
  // TEST 1: Debit More Than Available Balance
  // ==========================================
  describe('Debit more than available balance', () => {
    it('should reject debit when amount exceeds balance', async () => {
      const initialBalance = 1000;
      const debitAmount = 1500; // More than balance

      // Attempt to debit
      const { error } = await supabase.rpc('atomic_debit_wallet', {
        p_user_id: testUserId,
        p_amount: debitAmount,
        p_reference: `TEST_REJECT_${Date.now()}`,
        p_type: 'purchase',
        p_description: 'Test debit rejection',
      });

      // Should fail with insufficient balance error
      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/insufficient|balance|negative/i);

      // Verify balance unchanged
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', testUserId)
        .single();
      
      expect(wallet?.balance).toBe(initialBalance);

      // Verify NO transaction was created
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', testUserId);
      
      expect(transactions?.length).toBe(0);
    });

    it('should reject debit when balance is exactly zero', async () => {
      // Set balance to 0
      await supabase.from('wallets').update({ balance: 0 }).eq('user_id', testUserId);

      const { error } = await supabase.rpc('atomic_debit_wallet', {
        p_user_id: testUserId,
        p_amount: 1,
        p_reference: `TEST_ZERO_${Date.now()}`,
        p_type: 'purchase',
        p_description: 'Test zero balance',
      });

      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/insufficient|balance|negative/i);

      // Verify balance still 0
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', testUserId)
        .single();
      
      expect(wallet?.balance).toBe(0);
    });

    it('should not create partial state on failed debit', async () => {
      const initialBalance = 1000;

      // Multiple failed debit attempts
      await supabase.rpc('atomic_debit_wallet', {
        p_user_id: testUserId,
        p_amount: 2000,
        p_reference: `TEST_PARTIAL_${Date.now()}_1`,
        p_type: 'purchase',
        p_description: 'Test partial state',
      });

      await supabase.rpc('atomic_debit_wallet', {
        p_user_id: testUserId,
        p_amount: 3000,
        p_reference: `TEST_PARTIAL_${Date.now()}_2`,
        p_type: 'purchase',
        p_description: 'Test partial state 2',
      });

      // Verify balance is completely unchanged
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', testUserId)
        .single();
      
      expect(wallet?.balance).toBe(initialBalance);

      // Verify NO transactions were created
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id');
      
      expect(transactions?.length).toBe(0);
    });
  });

  // ==========================================
  // TEST 2: Concurrent Debit Requests
  // ==========================================
  describe('Concurrent debit requests', () => {
    it('should not allow double-spending with concurrent debits', async () => {
      const initialBalance = 100;
      const debitAmount = 60;

      // Set initial balance
      await supabase.from('wallets').update({ balance: initialBalance }).eq('user_id', testUserId);

      // Create 3 concurrent debit requests for 60 each
      // Only 1 should succeed (100 / 60 = 1.66, so only 1 can go through)
      const promises = [
        supabase.rpc('atomic_debit_wallet', {
          p_user_id: testUserId,
          p_amount: debitAmount,
          p_reference: `TEST_CONCURRENT_${Date.now()}_1`,
          p_type: 'purchase',
          p_description: 'Concurrent debit 1',
        }),
        supabase.rpc('atomic_debit_wallet', {
          p_user_id: testUserId,
          p_amount: debitAmount,
          p_reference: `TEST_CONCURRENT_${Date.now()}_2`,
          p_type: 'purchase',
          p_description: 'Concurrent debit 2',
        }),
        supabase.rpc('atomic_debit_wallet', {
          p_user_id: testUserId,
          p_amount: debitAmount,
          p_reference: `TEST_CONCURRENT_${Date.now()}_3`,
          p_type: 'purchase',
          p_description: 'Concurrent debit 3',
        }),
      ];

      const results = await Promise.all(promises);

      // Count successes and failures
      const successes = results.filter(r => !r.error);
      const failures = results.filter(r => r.error);

      // Only 1 should succeed (100 - 60 = 40)
      expect(successes.length).toBe(1);

      // 2 should fail due to insufficient balance
      expect(failures.length).toBe(2);

      // Final balance should be 40 (100 - 60)
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', testUserId)
        .single();
      
      expect(wallet?.balance).toBe(40);

      // Only 1 transaction should exist
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id');
      
      expect(transactions?.length).toBe(1);
    });

    it('should handle rapid sequential debits correctly', async () => {
      // Set initial balance
      await supabase.from('wallets').update({ balance: 100 }).eq('user_id', testUserId);

      // Debit 30 three times sequentially
      for (let i = 0; i < 3; i++) {
        const { error } = await supabase.rpc('atomic_debit_wallet', {
          p_user_id: testUserId,
          p_amount: 30,
          p_reference: `TEST_SEQ_${Date.now()}_${i}`,
          p_type: 'purchase',
          p_description: `Sequential debit ${i}`,
        });
        expect(error).toBeNull();
      }

      // Final balance should be 10 (100 - 30 - 30 - 30)
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', testUserId)
        .single();
      
      expect(wallet?.balance).toBe(10);

      // Should have 3 transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id');
      
      expect(transactions?.length).toBe(3);
    });
  });

  // ==========================================
  // TEST 3: Credit and Debit Success
  // ==========================================
  describe('Credit and debit operations', () => {
    it('should credit wallet and create transaction record', async () => {
      const initialBalance = 1000;
      const creditAmount = 500;
      const reference = `TEST_CREDIT_${Date.now()}`;

      // Credit wallet
      const { error } = await supabase.rpc('atomic_credit_wallet', {
        p_user_id: testUserId,
        p_amount: creditAmount,
        p_reference: reference,
        p_type: 'funding',
        p_description: 'Test credit',
      });

      expect(error).toBeNull();

      // Verify balance updated
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', testUserId)
        .single();
      
      expect(wallet?.balance).toBe(initialBalance + creditAmount);

      // Verify transaction record created
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('reference', reference)
        .single();
      
      expect(transaction).not.toBeNull();
      expect(transaction?.amount).toBe(creditAmount);
      expect(transaction?.type).toBe('funding');
      expect(transaction?.status).toBe('completed');
    });

    it('should debit wallet and create transaction record', async () => {
      const initialBalance = 1000;
      const debitAmount = 300;
      const reference = `TEST_DEBIT_${Date.now()}`;

      // Debit wallet
      const { error } = await supabase.rpc('atomic_debit_wallet', {
        p_user_id: testUserId,
        p_amount: debitAmount,
        p_reference: reference,
        p_type: 'purchase',
        p_description: 'Test debit',
      });

      expect(error).toBeNull();

      // Verify balance updated
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', testUserId)
        .single();
      
      expect(wallet?.balance).toBe(initialBalance - debitAmount);

      // Verify transaction record created
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('reference', reference)
        .single();
      
      expect(transaction).not.toBeNull();
      expect(transaction?.amount).toBe(debitAmount);
      expect(transaction?.type).toBe('purchase');
      expect(transaction?.status).toBe('completed');
    });

    it('should maintain correct balance after multiple operations', async () => {
      // Reset balance
      await supabase.from('wallets').update({ balance: 1000 }).eq('user_id', testUserId);
      await supabase.from('transactions').delete().eq('user_id', testUserId);

      let expectedBalance = 1000;

      // Credit 500
      await supabase.rpc('atomic_credit_wallet', {
        p_user_id: testUserId,
        p_amount: 500,
        p_reference: `TEST_MIXED_${Date.now()}_1`,
        p_type: 'funding',
        p_description: 'Credit',
      });
      expectedBalance += 500;

      // Debit 200
      await supabase.rpc('atomic_debit_wallet', {
        p_user_id: testUserId,
        p_amount: 200,
        p_reference: `TEST_MIXED_${Date.now()}_2`,
        p_type: 'purchase',
        p_description: 'Debit',
      });
      expectedBalance -= 200;

      // Credit 100
      await supabase.rpc('atomic_credit_wallet', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reference: `TEST_MIXED_${Date.now()}_3`,
        p_type: 'funding',
        p_description: 'Credit',
      });
      expectedBalance += 100;

      // Final balance: 1000 + 500 - 200 + 100 = 1400
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', testUserId)
        .single();
      
      expect(wallet?.balance).toBe(expectedBalance);

      // Should have 3 transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id');
      
      expect(transactions?.length).toBe(3);
    });

    it('should reject duplicate reference', async () => {
      const reference = `TEST_DUP_${Date.now()}`;

      // First credit should succeed
      const { error: error1 } = await supabase.rpc('atomic_credit_wallet', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reference: reference,
        p_type: 'funding',
        p_description: 'First credit',
      });
      expect(error1).toBeNull();

      // Second credit with same reference should fail
      const { error: error2 } = await supabase.rpc('atomic_credit_wallet', {
        p_user_id: testUserId,
        p_amount: 100,
        p_reference: reference,
        p_type: 'funding',
        p_description: 'Duplicate credit',
      });
      expect(error2).not.toBeNull();

      // Balance should only be credited once
      // Should only have one credit of 100, not 200
      const { data: txCount } = await supabase
        .from('transactions')
        .select('id', { count: 'exact' })
        .eq('reference', reference);
      
      expect(txCount?.length).toBe(1);
    });
  });

  // ==========================================
  // TEST 4: Edge Cases
  // ==========================================
  describe('Edge cases', () => {
    it('should reject negative amounts', async () => {
      const { error } = await supabase.rpc('atomic_debit_wallet', {
        p_user_id: testUserId,
        p_amount: -100,
        p_reference: `TEST_NEG_${Date.now()}`,
        p_type: 'purchase',
        p_description: 'Negative debit',
      });

      expect(error).not.toBeNull();
    });

    it('should reject zero amounts', async () => {
      const { error } = await supabase.rpc('atomic_debit_wallet', {
        p_user_id: testUserId,
        p_amount: 0,
        p_reference: `TEST_ZERO_${Date.now()}`,
        p_type: 'purchase',
        p_description: 'Zero debit',
      });

      expect(error).not.toBeNull();
    });

    it('should handle small decimal amounts correctly', async () => {
      await supabase.from('wallets').update({ balance: 100.50 }).eq('user_id', testUserId);

      const { error } = await supabase.rpc('atomic_debit_wallet', {
        p_user_id: testUserId,
        p_amount: 0.01,
        p_reference: `TEST_DECIMAL_${Date.now()}`,
        p_type: 'purchase',
        p_description: 'Decimal debit',
      });

      expect(error).toBeNull();

      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', testUserId)
        .single();
      
      expect(wallet?.balance).toBe(100.49);
    });
  });
});
