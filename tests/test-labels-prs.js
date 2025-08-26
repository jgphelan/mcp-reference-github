#!/usr/bin/env node

import { spawn } from 'child_process';

// Test the new label, milestone, and PR functionality
async function testLabelsAndPRs() {
  console.log('🔒 Testing MCP GitHub Server Labels & PRs Features...\n');

  // Test Case 1: Labels and Milestones (read-only)
  console.log('📋 Test Case 1: Labels and Milestones (read-only operations)');
  console.log('Expected: Should work without token, enforce allowlist\n');
  
  const serverProcess = spawn('npm', ['start'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  try {
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test list_milestones on allowlisted repo
    console.log('🔍 Testing list_milestones on allowlisted repo (should work)...');
    const milestoneResponse = await sendMcpMessage(serverProcess, 'tools/call', {
      name: 'list_milestones',
      arguments: {
        owner: 'jgphelan',
        repo: 'mcp-github-reference',
        state: 'open',
        per_page: 5
      }
    });

    if (milestoneResponse.result && milestoneResponse.result.content) {
      console.log('✅ list_milestones successful!');
      console.log(milestoneResponse.result.content[0].text);
    } else if (milestoneResponse.error) {
      console.log('❌ list_milestones failed:', milestoneResponse.error.message);
    }

    // Test list_milestones on non-allowlisted repo (should fail)
    console.log('\n🔍 Testing list_milestones on non-allowlisted repo (should fail)...');
    const milestoneResponse2 = await sendMcpMessage(serverProcess, 'tools/call', {
      name: 'list_milestones',
      arguments: {
        owner: 'facebook',
        repo: 'react',
        state: 'open',
        per_page: 5
      }
    });

    if (milestoneResponse2.result && milestoneResponse2.result.error) {
      console.log('✅ Correctly blocked non-allowlisted repo:', milestoneResponse2.result.error.message);
    } else {
      console.log('❌ Should have blocked non-allowlisted repo');
    }

    console.log('\n✅ Test Case 1 completed\n');
    
  } catch (error) {
    console.error('❌ Test Case 1 failed:', error.message);
  } finally {
    serverProcess.kill();
  }

  // Test Case 2: Write operations with token
  console.log('📋 Test Case 2: Write operations with token');
  console.log('Expected: Should work on allowlisted repos, fail on non-allowlisted\n');
  
  const serverProcess2 = spawn('npm', ['start'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  try {
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test add_label_to_issue on allowlisted repo (should work)
    console.log('🔍 Testing add_label_to_issue on allowlisted repo (should work)...');
    const labelResponse = await sendMcpMessage(serverProcess2, 'tools/call', {
      name: 'add_label_to_issue',
      arguments: {
        owner: 'jgphelan',
        repo: 'mcp-github-reference',
        issue_number: 1,
        labels: ['enhancement', 'documentation']
      }
    });

    if (labelResponse.result && labelResponse.result.content) {
      console.log('✅ add_label_to_issue successful!');
      console.log(labelResponse.result.content[0].text);
    } else if (labelResponse.result && labelResponse.result.error) {
      console.log('⚠️  add_label_to_issue failed (expected if issue doesn\'t exist):', labelResponse.result.error.message);
    }

    // Test add_label_to_issue on non-allowlisted repo (should fail)
    console.log('\n🔍 Testing add_label_to_issue on non-allowlisted repo (should fail)...');
    const labelResponse2 = await sendMcpMessage(serverProcess2, 'tools/call', {
      name: 'add_label_to_issue',
      arguments: {
        owner: 'facebook',
        repo: 'react',
        issue_number: 1,
        labels: ['bug']
      }
    });

    if (labelResponse2.result && labelResponse2.result.error) {
      console.log('✅ Correctly blocked non-allowlisted repo:', labelResponse2.result.error.message);
    } else {
      console.log('❌ Should have blocked non-allowlisted repo');
    }

    console.log('\n✅ Test Case 2 completed\n');
    
  } catch (error) {
    console.error('❌ Test Case 2 failed:', error.message);
  } finally {
    serverProcess2.kill();
  }

  // Test Case 3: PR operations
  console.log('📋 Test Case 3: PR operations');
  console.log('Expected: Should enforce allowlist and confirmation requirements\n');
  
  const serverProcess3 = spawn('npm', ['start'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  try {
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test merge_pr with confirmation required (should ask for confirmation)
    console.log('🔍 Testing merge_pr with confirmation required (should ask for confirmation)...');
    const mergeResponse = await sendMcpMessage(serverProcess3, 'tools/call', {
      name: 'merge_pr',
      arguments: {
        owner: 'jgphelan',
        repo: 'mcp-github-reference',
        number: 1,
        method: 'squash',
        require_confirmation: true
      }
    });

    if (mergeResponse.result && mergeResponse.result.content) {
      console.log('✅ merge_pr correctly asked for confirmation!');
      console.log(mergeResponse.result.content[0].text);
    } else if (mergeResponse.result && mergeResponse.result.error) {
      console.log('❌ merge_pr failed:', mergeResponse.result.error.message);
    }

    // Test label_pr on allowlisted repo (should work)
    console.log('\n🔍 Testing label_pr on allowlisted repo (should work)...');
    const prLabelResponse = await sendMcpMessage(serverProcess3, 'tools/call', {
      name: 'label_pr',
      arguments: {
        owner: 'jgphelan',
        repo: 'mcp-github-reference',
        number: 1,
        labels: ['ready-for-review']
      }
    });

    if (prLabelResponse.result && prLabelResponse.result.content) {
      console.log('✅ label_pr successful!');
      console.log(prLabelResponse.result.content[0].text);
    } else if (prLabelResponse.result && prLabelResponse.result.error) {
      console.log('⚠️  label_pr failed (expected if PR doesn\'t exist):', prLabelResponse.result.error.message);
    }

    console.log('\n✅ Test Case 3 completed\n');
    
  } catch (error) {
    console.error('❌ Test Case 3 failed:', error.message);
  } finally {
    serverProcess3.kill();
  }

  // Test Case 4: Resources
  console.log('📋 Test Case 4: New Resources');
  console.log('Expected: Labels and PRs resources should be available\n');
  
  const serverProcess4 = spawn('npm', ['start'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  try {
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test resources listing
    console.log('🔍 Testing resources listing...');
    const resourcesResponse = await sendMcpMessage(serverProcess4, 'resources/list');
    
    if (resourcesResponse.result && resourcesResponse.result.resources) {
      console.log('✅ Resources listing successful! Available resources:');
      resourcesResponse.result.resources.forEach(resource => {
        console.log(`   - ${resource.name}: ${resource.title}`);
        console.log(`     URI: ${resource.uri}`);
      });
      
      // Check if new resources are present
      const hasLabels = resourcesResponse.result.resources.some(r => r.name === 'repo-labels');
      const hasPulls = resourcesResponse.result.resources.some(r => r.name === 'repo-pulls');
      
      console.log(`\n📊 New Resources Status:`);
      console.log(`   - Labels resource: ${hasLabels ? '✅' : '❌'}`);
      console.log(`   - Pulls resource: ${hasPulls ? '✅' : '❌'}`);
    }

    console.log('\n✅ Test Case 4 completed\n');
    
  } catch (error) {
    console.error('❌ Test Case 4 failed:', error.message);
  } finally {
    serverProcess4.kill();
  }

  console.log('🎉 Labels & PRs feature tests completed!');
  console.log('\n📝 Summary:');
  console.log('   - Test Case 1: Labels and milestones (read-only)');
  console.log('   - Test Case 2: Write operations with token');
  console.log('   - Test Case 3: PR operations and confirmation');
  console.log('   - Test Case 4: New resources availability');
}

// Helper function to send MCP message and get response
async function sendMcpMessage(serverProcess, method, params = null) {
  const message = {
    jsonrpc: "2.0",
    id: Math.floor(Math.random() * 10000),
    method,
    ...(params && { params })
  };

  return new Promise((resolve, reject) => {
    let responseData = '';
    
    // Listen for response
    const onData = (data) => {
      responseData += data.toString();
      
      // Try to parse any complete JSON responses
      const lines = responseData.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line.trim());
            if (response.id === message.id) {
              serverProcess.stdout.removeListener('data', onData);
              resolve(response);
              return;
            }
          } catch (e) {
            // Not valid JSON, continue
          }
        }
      }
    };

    serverProcess.stdout.on('data', onData);
    
    // Send message to server
    serverProcess.stdin.write(JSON.stringify(message) + '\n');
    
    // Timeout after 15 seconds
    setTimeout(() => {
      serverProcess.stdout.removeListener('data', onData);
      reject(new Error(`Timeout waiting for response to ${method}`));
    }, 15000);
  });
}

// Run the tests
testLabelsAndPRs().catch(console.error);
