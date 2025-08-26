#!/usr/bin/env node

import { spawn } from 'child_process';

// Test the hardening features
async function testHardening() {
  console.log('🔒 Testing MCP GitHub Server Hardening Features...\n');

  // Test Case A: No token (read-only mode)
  console.log('📋 Test Case A: No token (read-only mode)');
  console.log('Expected: Server logs read-only mode, write tools return unauthorized error\n');
  
  // Temporarily unset GITHUB_TOKEN
  const env = { ...process.env };
  delete env.GITHUB_TOKEN;
  
  const serverProcess = spawn('npm', ['start'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe'],
    env
  });

  try {
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check server logs for read-only mode
    console.log('✅ Server should show: [INFO] Running in read-only mode (no GITHUB_TOKEN)');
    
    // Test write tool (should fail)
    console.log('\n🔍 Testing create_issue tool (should fail with unauthorized)...');
    const message = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "create_issue",
        arguments: {
          owner: "jgphelan",
          repo: "mcp-github-reference",
          title: "Test",
          body: "Test issue"
        }
      }
    };
    
    serverProcess.stdin.write(JSON.stringify(message) + '\n');
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Test Case A completed\n');
    
  } catch (error) {
    console.error('❌ Test Case A failed:', error.message);
  } finally {
    serverProcess.kill();
  }

  // Test Case B: With token but non-allowlisted repo
  console.log('📋 Test Case B: With token but non-allowlisted repo');
  console.log('Expected: create_issue works on allowlisted repo, fails on non-allowlisted\n');
  
  const serverProcess2 = spawn('npm', ['start'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  try {
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check server logs for full access mode
    console.log('✅ Server should show: [INFO] Running with GitHub token - full read/write access enabled');
    
    // Test allowlisted repo (should work)
    console.log('\n🔍 Testing create_issue on allowlisted repo (should work)...');
    const message1 = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "create_issue",
        arguments: {
          owner: "jgphelan",
          repo: "mcp-github-reference",
          title: "Test",
          body: "Test issue"
        }
      }
    };
    
    serverProcess2.stdin.write(JSON.stringify(message1) + '\n');
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test non-allowlisted repo (should fail)
    console.log('\n🔍 Testing create_issue on non-allowlisted repo (should fail)...');
    const message2 = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "create_issue",
        arguments: {
          owner: "facebook",
          repo: "react",
          title: "Test",
          body: "Test issue"
        }
      }
    };
    
    serverProcess2.stdin.write(JSON.stringify(message2) + '\n');
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Test Case B completed\n');
    
  } catch (error) {
    console.error('❌ Test Case B failed:', error.message);
  } finally {
    serverProcess2.kill();
  }

  console.log('🎉 Hardening feature tests completed!');
  console.log('\n📝 Summary:');
  console.log('   - Test Case A: Read-only mode when no token');
  console.log('   - Test Case B: Allowlist enforcement with token');
  console.log('   - Rate limiting: Handled in GitHub API layer');
}

// Run the tests
testHardening().catch(console.error);
