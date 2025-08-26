#!/usr/bin/env node

import { listIssues, searchIssues } from '../src/github.mjs';

async function testGitHubAPI() {
  console.log('🚀 Testing GitHub API functions directly...\n');

  try {
    // Test 1: Search issues in facebook/react
    console.log('1️⃣ Testing searchIssues for facebook/react (query: "bug")...');
    const searchResult = await searchIssues('facebook', 'react', 'bug', 3);
    console.log('✅ Search successful! Found', searchResult.items.length, 'issues:');
    searchResult.items.forEach((issue, index) => {
      console.log(`   ${index + 1}. #${issue.number} ${issue.title}`);
      console.log(`      URL: ${issue.html_url}`);
    });

    console.log('\n2️⃣ Testing searchIssues for microsoft/vscode (query: "feature")...');
    const searchResult2 = await searchIssues('microsoft', 'vscode', 'feature', 3);
    console.log('✅ Second search successful! Found', searchResult2.items.length, 'issues:');
    searchResult2.items.forEach((issue, index) => {
      console.log(`   ${index + 1}. #${issue.number} ${issue.title}`);
      console.log(`      URL: ${issue.html_url}`);
    });

    console.log('\n3️⃣ Testing listIssues for facebook/react (open issues)...');
    const listResult = await listIssues('facebook', 'react', { state: 'open', per_page: 3 });
    console.log('✅ List successful! Found', listResult.length, 'open issues:');
    listResult.forEach((issue, index) => {
      console.log(`   ${index + 1}. #${issue.number} ${issue.title} (by @${issue.user.login})`);
      console.log(`      URL: ${issue.html_url}`);
    });

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Facebook/React bug search: ${searchResult.items.length} issues`);
    console.log(`   - Microsoft/VSCode feature search: ${searchResult2.items.length} issues`);
    console.log(`   - Facebook/React open issues: ${listResult.length} issues`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n💡 This might be a rate limiting or authentication issue.');
      console.log('   Make sure your GITHUB_TOKEN is set correctly in your .env file.');
    }
  }
}

// Run the test
testGitHubAPI();
