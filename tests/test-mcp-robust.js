#!/usr/bin/env node

import { spawn } from 'child_process';

// MCP message ID counter
let messageId = 1;

// Function to send MCP message and get response
async function sendMcpMessage(serverProcess, method, params = null) {
  const message = {
    jsonrpc: "2.0",
    id: messageId++,
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
    
    // Timeout after 20 seconds
    setTimeout(() => {
      serverProcess.stdout.removeListener('data', onData);
      reject(new Error(`Timeout waiting for response to ${method}`));
    }, 20000);
  });
}

// Main test function
async function testMcpServer() {
  console.log('🚀 Starting MCP GitHub Server test...\n');

  // Start the MCP server
  const serverProcess = spawn('npm', ['start'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Handle server errors
  serverProcess.stderr.on('data', (data) => {
    const output = data.toString();
    if (output.includes('GITHUB_TOKEN')) {
      console.log('ℹ️  Server info:', output.trim());
    } else {
      console.log('Server stderr:', output.trim());
    }
  });

  try {
    // Wait for server to start
    console.log('⏳ Waiting for server to start...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('1️⃣ Initializing MCP server...');
    const initResponse = await sendMcpMessage(serverProcess, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    });
    console.log('✅ Server initialized:', initResponse.result.serverInfo.name, 'v' + initResponse.result.serverInfo.version);

    console.log('\n2️⃣ Testing search_issues tool for facebook/react...');
    const searchResponse = await sendMcpMessage(serverProcess, 'tools/call', {
      name: 'search_issues',
      arguments: {
        owner: 'facebook',
        repo: 'react',
        query: 'bug',
        per_page: 3
      }
    });

    if (searchResponse.result && searchResponse.result.content) {
      console.log('✅ Search successful! Found issues:');
      console.log(searchResponse.result.content[0].text);
    } else if (searchResponse.error) {
      console.log('❌ Search failed:', searchResponse.error.message);
    }

    console.log('\n3️⃣ Testing listIssues functionality via search...');
    const listResponse = await sendMcpMessage(serverProcess, 'tools/call', {
      name: 'search_issues',
      arguments: {
        owner: 'microsoft',
        repo: 'vscode',
        query: 'state:open',
        per_page: 2
      }
    });

    if (listResponse.result && listResponse.result.content) {
      console.log('✅ List search successful! Found issues:');
      console.log(listResponse.result.content[0].text);
    } else if (listResponse.error) {
      console.log('❌ List search failed:', listResponse.error.message);
    }

    console.log('\n4️⃣ Testing tools listing...');
    const toolsResponse = await sendMcpMessage(serverProcess, 'tools/list');
    if (toolsResponse.result && toolsResponse.result.tools) {
      console.log('✅ Tools listing successful! Available tools:');
      toolsResponse.result.tools.forEach(tool => {
        console.log(`   - ${tool.name}: ${tool.title}`);
      });
    }

    console.log('\n5️⃣ Testing resources listing...');
    const resourcesResponse = await sendMcpMessage(serverProcess, 'resources/list');
    if (resourcesResponse.result && resourcesResponse.result.resources) {
      console.log('✅ Resources listing successful! Available resources:');
      resourcesResponse.result.resources.forEach(resource => {
        console.log(`   - ${resource.name}: ${resource.title}`);
        console.log(`     URI: ${resource.uri}`);
      });
    }

    console.log('\n🎉 MCP Server test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Clean up
    console.log('\n🔄 Shutting down server...');
    serverProcess.kill();
    process.exit(0);
  }
}

// Run the test
testMcpServer().catch(console.error);
