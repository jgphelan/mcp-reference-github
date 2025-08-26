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
      
      // Check if we have a complete JSON response
      try {
        const response = JSON.parse(responseData.trim());
        if (response.id === message.id) {
          serverProcess.stdout.removeListener('data', onData);
          resolve(response);
        }
      } catch (e) {
        // Incomplete JSON, continue collecting data
      }
    };

    serverProcess.stdout.on('data', onData);
    
    // Send message to server
    serverProcess.stdin.write(JSON.stringify(message) + '\n');
    
    // Timeout after 15 seconds
    setTimeout(() => {
      serverProcess.stdout.removeListener('data', onData);
      reject(new Error('Timeout waiting for response'));
    }, 15000);
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
    console.log('Server stderr:', data.toString());
  });

  try {
    // Wait a bit for server to start
    console.log('⏳ Waiting for server to start...');
    await new Promise(resolve => setTimeout(resolve, 2000));

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
        per_page: 5
      }
    });

    if (searchResponse.result && searchResponse.result.content) {
      console.log('✅ Search successful! Found issues:');
      console.log(searchResponse.result.content[0].text);
    } else if (searchResponse.error) {
      console.log('❌ Search failed:', searchResponse.error.message);
    }

    console.log('\n3️⃣ Testing search_issues tool for microsoft/vscode...');
    const searchResponse2 = await sendMcpMessage(serverProcess, 'tools/call', {
      name: 'search_issues',
      arguments: {
        owner: 'microsoft',
        repo: 'vscode',
        query: 'feature',
        per_page: 3
      }
    });

    if (searchResponse2.result && searchResponse2.result.content) {
      console.log('✅ Second search successful! Found issues:');
      console.log(searchResponse2.result.content[0].text);
    } else if (searchResponse2.error) {
      console.log('❌ Second search failed:', searchResponse2.error.message);
    }

    console.log('\n🎉 Test completed successfully!');

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
