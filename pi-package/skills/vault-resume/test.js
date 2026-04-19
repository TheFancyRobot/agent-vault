#!/usr/bin/env node

/**
 * Test script for vault-resume skill
 * 
 * This script demonstrates how to use the vault-resume skill
 * and tests its core functionality.
 */

const { vaultResume } = require('./index');

// Mock fs and child_process for testing
const fs = require('fs');
const path = require('path');

// Test helper functions
function createMockVault() {
  const dirs = [
    '.agent-vault',
    '.agent-vault/02_Phases',
    '.agent-vault/02_Phases/Phase_01_Foundation',
    '.agent-vault/05_Sessions'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // Create a mock phase
  const phaseContent = `---
phase_id: phase_001
phase_number: 01
status: in-progress
created_at: 2024-01-15T14:00:00Z
---

# Phase 01: Foundation

## Overview
This phase establishes the foundation for the project.

## Steps
- [[Step_01]] - Setup
- [[Step_02]] - Configuration
- [[Step_03]] - Authentication
`;
  
  fs.writeFileSync('.agent-vault/02_Phases/Phase_01_Foundation/Phase.md', phaseContent);
  
  // Create mock steps
  const step1Content = `---
step_id: step_001
phase: Phase_01
status: completed
created_at: 2024-01-15T14:10:00Z
related_sessions: ["session_2024_01_15_14_00"]
---

# Step 01: Setup

## Objective
Set up the project structure.

## Acceptance Criteria
- [x] Directory structure created
- [x] Configuration files initialized
`;
  
  const step2Content = `---
step_id: step_002
phase: Phase_01
status: in-progress
created_at: 2024-01-15T14:20:00Z
related_sessions: ["session_2024_01_15_14_30"]
---

# Step 02: Configuration

## Objective
Configure the application.

## Acceptance Criteria
- [ ] Environment variables set
- [ ] Database configured
`;
  
  fs.writeFileSync('.agent-vault/02_Phases/Phase_01_Foundation/Step_01_Setup.md', step1Content);
  fs.writeFileSync('.agent-vault/02_Phases/Phase_01_Foundation/Step_02_Configuration.md', step2Content);
  
  // Create a mock previous session
  const sessionContent = `---
session_id: session_2024_01_15_14_30
status: in-progress
created_at: 2024-01-15T14:30:00Z
phase: "02_Phases/Phase_01_Foundation/Phase"
related_bugs: ["bug_001"]
related_decisions: ["decision_001"]
agent: test-agent
---

## Objective
Implement configuration for Phase 01.

## Planned Scope
- Set up environment variables
- Configure database connection

## Execution Log
14:30 - Started configuration setup
14:35 - Created .env file
14:40 - Encountered issue with database credentials

## Changed Paths
- .env
- config/database.js

## Validation Run
npm test - FAILED (missing database connection)

## Findings
- Database requires SSL in production
- Environment variables need validation

## Follow-Up Work
- [ ] Fix database connection issue
- [ ] Add environment variable validation

## Completion Summary
Session interrupted while configuring database connection.
`;
  
  fs.writeFileSync('.agent-vault/05_Sessions/2024-01-15_14-30_Session.md', sessionContent);
}

function cleanupMockVault() {
  if (fs.existsSync('.agent-vault')) {
    fs.rmSync('.agent-vault', { recursive: true, force: true });
  }
}

async function testResumeFromMostRecent() {
  console.log('\n=== Test: Resume from Most Recent Session ===\n');
  
  try {
    createMockVault();
    
    const result = await vaultResume();
    
    if (result) {
      console.log('✅ Successfully resumed session');
      console.log('Session ID:', result.session?.id);
      console.log('Continuation target:', result.continuationTarget?.description);
      console.log('Needs refinement:', result.needsRefinement || false);
      
      // Verify new session was created
      if (fs.existsSync(result.session?.filePath)) {
        console.log('✅ New session file created');
        const content = fs.readFileSync(result.session.filePath, 'utf8');
        console.log('\nNew session content preview:');
        console.log(content.substring(0, 500) + '...\n');
      }
    } else {
      console.log('❌ Failed to resume session');
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  } finally {
    cleanupMockVault();
  }
}

async function testResumeFromSpecificSession() {
  console.log('\n=== Test: Resume from Specific Session ===\n');
  
  try {
    createMockVault();
    
    const sessionId = 'session_2024_01_15_14_30';
    const result = await vaultResume({ session: sessionId });
    
    if (result) {
      console.log('✅ Successfully resumed session by ID');
      console.log('Session ID:', result.session?.id);
    } else {
      console.log('❌ Failed to resume session by ID');
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  } finally {
    cleanupMockVault();
  }
}

async function testNoSessionsFound() {
  console.log('\n=== Test: No Sessions Found ===\n');
  
  try {
    // Don't create mock vault
    const result = await vaultResume();
    
    if (!result) {
      console.log('✅ Correctly handled missing sessions');
    } else {
      console.log('❌ Should have returned null for missing sessions');
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

async function runAllTests() {
  console.log('Starting vault-resume skill tests...\n');
  
  await testNoSessionsFound();
  await testResumeFromMostRecent();
  await testResumeFromSpecificSession();
  
  console.log('\n=== All tests completed ===\n');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testResumeFromMostRecent,
  testResumeFromSpecificSession,
  testNoSessionsFound,
  createMockVault,
  cleanupMockVault
};