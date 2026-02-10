/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
/**
 * Auth Test Script
 * Tests user registration flow and identifies errors
 * Run with: npx tsx scripts/test-auth.ts
 * 
 * Requires .env.local with:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  console.error('Missing environment variables. Make sure .env.local is set.');
  process.exit(1);
}

// Use service role for admin operations
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Use anon key for regular operations (like real user would)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testEmail = `test_${Date.now()}@test.com`;
const testPassword = 'Test123456!';
const testName = 'Test User';

interface TestResult {
  name: string;
  status: 'passed' | 'failed';
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  }[type];
  console.log(`${prefix} ${message}`);
}

async function testSupabaseConnection(): Promise<TestResult> {
  log('Testing Supabase connection...');
  
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(0);
    
    if (error) {
      return { name: 'Supabase Connection', status: 'failed', error: error.message };
    }
    
    return { name: 'Supabase Connection', status: 'passed' };
  } catch (err: any) {
    return { name: 'Supabase Connection', status: 'failed', error: err.message };
  }
}

async function testDatabaseTables(): Promise<TestResult[]> {
  log('Checking database tables...');
  const tableResults: TestResult[] = [];
  
  const tables = ['profiles', 'loyalty_points', 'referral_codes', 'orders', 'products'];
  
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(0);
      
      if (error) {
        tableResults.push({ 
          name: `Table: ${table}`, 
          status: 'failed', 
          error: error.message,
          details: error.code === '42P01' ? 'Table does not exist!' : undefined
        });
      } else {
        tableResults.push({ name: `Table: ${table}`, status: 'passed' });
      }
    } catch (err: any) {
      tableResults.push({ name: `Table: ${table}`, status: 'failed', error: err.message });
    }
  }
  
  return tableResults;
}

async function testUserSignup(): Promise<TestResult> {
  log(`Testing user signup with email: ${testEmail}...`);
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: testName,
        },
      },
    });

    if (error) {
      return { 
        name: 'User Signup', 
        status: 'failed', 
        error: error.message,
        details: `Error code: ${error.status}`
      };
    }

    if (!data.user) {
      return { 
        name: 'User Signup', 
        status: 'failed', 
        error: 'No user returned after signup' 
      };
    }

    // Check if email confirmation is required
    if (data.user.email_confirmed_at === null) {
      return { 
        name: 'User Signup', 
        status: 'passed',
        details: `User created (ID: ${data.user.id}). Email confirmation pending.`
      };
    }

    return { 
      name: 'User Signup', 
      status: 'passed',
      details: `User created with ID: ${data.user.id}`
    };
  } catch (err: any) {
    return { name: 'User Signup', status: 'failed', error: err.message };
  }
}

async function testProfileCreationWithServiceRole(userId: string): Promise<TestResult> {
  log('Testing profile creation with service role...');
  
  try {
    // Try to insert profile using service role
    const { data, error } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email: testEmail,
      full_name: testName,
    }).select().single();

    if (error) {
      return { 
        name: 'Profile Creation (Service Role)', 
        status: 'failed', 
        error: error.message,
        details: `Error code: ${error.code}`
      };
    }

    return { 
      name: 'Profile Creation (Service Role)', 
      status: 'passed',
      details: `Profile created for user: ${data.id}`
    };
  } catch (err: any) {
    return { name: 'Profile Creation (Service Role)', status: 'failed', error: err.message };
  }
}

async function testProfileCreationWithAnon(userId: string): Promise<TestResult> {
  log('Testing profile creation with anon key (RLS check)...');
  
  try {
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      email: testEmail,
      full_name: testName,
    });

    if (error) {
      return { 
        name: 'Profile Creation (Anon/RLS)', 
        status: 'failed', 
        error: error.message,
        details: error.code === '42501' ? 'RLS policy blocking insert. This is expected if user is not authenticated.' : undefined
      };
    }

    return { name: 'Profile Creation (Anon/RLS)', status: 'passed' };
  } catch (err: any) {
    return { name: 'Profile Creation (Anon/RLS)', status: 'failed', error: err.message };
  }
}

async function testLoyaltyPointsCreation(userId: string): Promise<TestResult> {
  log('Testing loyalty points creation...');
  
  try {
    const { data, error } = await supabaseAdmin.from('loyalty_points').upsert({
      user_id: userId,
      total_points: 0,
      tier: 'bronze',
      lifetime_points: 0,
    }).select().single();

    if (error) {
      return { 
        name: 'Loyalty Points Creation', 
        status: 'failed', 
        error: error.message,
        details: error.code === '42P01' ? 'Table does not exist!' : undefined
      };
    }

    return { 
      name: 'Loyalty Points Creation', 
      status: 'passed',
      details: `Loyalty points created for user: ${data.user_id}`
    };
  } catch (err: any) {
    return { name: 'Loyalty Points Creation', status: 'failed', error: err.message };
  }
}

async function testReferralCodeCreation(userId: string): Promise<TestResult> {
  log('Testing referral code creation...');
  
  const referralCode = `REF-${userId.substring(0, 8).toUpperCase()}`;
  
  try {
    const { data, error } = await supabaseAdmin.from('referral_codes').upsert({
      user_id: userId,
      code: referralCode,
      reward_points: 100,
    }).select().single();

    if (error) {
      return { 
        name: 'Referral Code Creation', 
        status: 'failed', 
        error: error.message,
        details: error.code === '42P01' ? 'Table does not exist!' : undefined
      };
    }

    return { 
      name: 'Referral Code Creation', 
      status: 'passed',
      details: `Referral code created: ${referralCode}`  
    };
  } catch (err: any) {
    return { name: 'Referral Code Creation', status: 'failed', error: err.message };
  }
}

async function testRLSPolicies(): Promise<TestResult[]> {
  log('Testing RLS policies...');
  const rlsResults: TestResult[] = [];
  
  // Test anonymous access to profiles table
  try {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
      rlsResults.push({ 
        name: 'RLS: Profiles Read (Anon)', 
        status: 'passed',
        details: 'Anonymous read blocked (expected)'
      });
    } else {
      rlsResults.push({ 
        name: 'RLS: Profiles Read (Anon)', 
        status: 'failed',
        error: 'Anonymous users can read profiles! RLS may not be enabled.'
      });
    }
  } catch (err: any) {
    rlsResults.push({ name: 'RLS: Profiles Read (Anon)', status: 'failed', error: err.message });
  }
  
  return rlsResults;
}

async function cleanupTestUser(userId: string) {
  log('Cleaning up test user...', 'info');
  
  try {
    // Delete referral code
    await supabaseAdmin.from('referral_codes').delete().eq('user_id', userId);
    // Delete loyalty points
    await supabaseAdmin.from('loyalty_points').delete().eq('user_id', userId);
    // Delete profile
    await supabaseAdmin.from('profiles').delete().eq('id', userId);
    // Delete auth user
    await supabaseAdmin.auth.admin.deleteUser(userId);
    log('Test user cleaned up successfully', 'success');
  } catch (err: any) {
    log(`Cleanup failed: ${err.message}`, 'warning');
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('   DONUT SHOP AUTH TEST SUITE');
  console.log('========================================\n');
  
  // Test 1: Supabase Connection
  const connectionResult = await testSupabaseConnection();
  results.push(connectionResult);
  
  if (connectionResult.status === 'failed') {
    log('Cannot continue tests - Supabase connection failed!', 'error');
    printResults();
    return;
  }
  
  // Test 2: Database Tables
  const tableResults = await testDatabaseTables();
  results.push(...tableResults);
  
  // Test 3: User Signup
  const signupResult = await testUserSignup();
  results.push(signupResult);
  
  let testUserId: string | null = null;
  
  if (signupResult.status === 'passed' && signupResult.details?.includes('ID:')) {
    const match = signupResult.details.match(/ID: ([a-f0-9-]+)/);
    testUserId = match ? match[1] : null;
  }
  
  if (testUserId) {
    // Test 4: Profile Creation (Service Role)
    const profileServiceResult = await testProfileCreationWithServiceRole(testUserId);
    results.push(profileServiceResult);
    
    // Test 5: Loyalty Points
    const loyaltyResult = await testLoyaltyPointsCreation(testUserId);
    results.push(loyaltyResult);
    
    // Test 6: Referral Code
    const referralResult = await testReferralCodeCreation(testUserId);
    results.push(referralResult);
    
    // Cleanup
    await cleanupTestUser(testUserId);
  }
  
  // Test 7: RLS Policies
  const rlsResults = await testRLSPolicies();
  results.push(...rlsResults);
  
  printResults();
}

function printResults() {
  console.log('\n========================================');
  console.log('   TEST RESULTS');
  console.log('========================================\n');
  
  const passed = results.filter(r => r.status === 'passed');
  const failed = results.filter(r => r.status === 'failed');
  
  console.log(`Total: ${results.length} | Passed: ${passed.length} | Failed: ${failed.length}\n`);
  
  for (const result of results) {
    const icon = result.status === 'passed' ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    if (result.details) {
      console.log(`   ℹ️  ${result.details}`);
    }
    if (result.error) {
      console.log(`   🔴 Error: ${result.error}`);
    }
  }
  
  if (failed.length > 0) {
    console.log('\n========================================');
    console.log('   ISSUES TO FIX');
    console.log('========================================\n');
    
    for (const result of failed) {
      console.log(`🔧 ${result.name}:`);
      console.log(`   ${result.error}`);
      if (result.details) {
        console.log(`   ${result.details}`);
      }
      console.log('');
    }
  }
}

runTests().catch(console.error);
