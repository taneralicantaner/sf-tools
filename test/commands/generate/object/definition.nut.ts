import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';

describe('generate object definition NUTs', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.start({ devhubAuthStrategy: 'PERF' });
  });

  after(async () => {
    await session?.end();
  });

  it('should generate object definition with default objects', async () => {
    const result = await execCmd<GenerateObjectDefinitionResult>('sf generate object definition --target-org perf', {
      ensureExitCode: 0,
    });
    expect(result.jsonOutput.result).to.be.true;
  });

  it('should generate object definition with specified objects', async () => {
    const result = await execCmd<GenerateObjectDefinitionResult>(
      'sf generate object definition --target-org perf --target-objects Account,Contact',
      { ensureExitCode: 0 }
    );
    expect(result.jsonOutput.result).to.be.true;
  });
});
