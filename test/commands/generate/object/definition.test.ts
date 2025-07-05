import { TestContext } from '@salesforce/core/testSetup';
import { expect } from 'chai';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import GenerateObjectDefinition from '../../../../src/commands/generate/object/definition.js';

describe('generate object definition', () => {
  const $$ = new TestContext();
  stubSfCommandUx($$);

  it('should have the correct summary and description', () => {
    expect(GenerateObjectDefinition.summary).to.equal('Generate object definition');
    expect(GenerateObjectDefinition.description).to.equal('Generates an Excel file with object definitions.');
  });

  it('should have the correct flags', () => {
    expect(GenerateObjectDefinition.flags['target-org'].required).to.be.true;
    expect(GenerateObjectDefinition.flags['target-objects'].summary).to.equal(
      'Comma-separated list of object names to process.'
    );
  });

  // Additional tests can be added here
});
