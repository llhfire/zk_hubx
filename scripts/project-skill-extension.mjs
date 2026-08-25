#!/usr/bin/env node

/**
 * Project Skill Extension Script
 * 
 * This script checks if a project has specialized instructions for a skill.
 * If no project extension exists, it returns "inactive" so the core skill continues.
 */

const args = process.argv.slice(2);
const command = args[0];
const skillIndex = args.indexOf('--skill');
const skillName = skillIndex !== -1 ? args[skillIndex + 1] : null;
const jsonFlag = args.includes('--json');

if (command === 'inspect' && skillName) {
  const result = {
    status: 'inactive',
    skill: skillName,
    message: 'No project extension found. Using core skill only.'
  };
  
  if (jsonFlag) {
    console.log(JSON.stringify(result));
  } else {
    console.log(result.message);
  }
  process.exit(0);
}

// Default: return inactive
const result = {
  status: 'inactive',
  message: 'No project extension configured.'
};

if (jsonFlag) {
  console.log(JSON.stringify(result));
} else {
  console.log(result.message);
}
process.exit(0);
