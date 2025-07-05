/* eslint-disable complexity */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import XLSX from 'xlsx';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-tools', 'generate.object.definition');

export type GenerateObjectDefinitionResult = {
  result: boolean;
};

export default class GenerateObjectDefinition extends SfCommand<GenerateObjectDefinitionResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
  };

  public async run(): Promise<GenerateObjectDefinitionResult> {
    const { flags } = await this.parse(GenerateObjectDefinition);
    const orgId = flags['target-org'].getOrgId();
    const connection = flags['target-org'].getConnection('64.0');

    this.log(`Connected to ${flags['target-org'].getUsername()} (${orgId}) with API version ${connection.version}`);

    const metadata = await connection.metadata.list([{ type: 'CustomObject', folder: null }]);

    const objectFullnames = metadata.map((sobject) => sobject.fullName);
    objectFullnames.sort();

    const workbook = XLSX.utils.book_new();

    for (const objectFullname of objectFullnames) {
      this.log(`Processing object: ${objectFullname}`);

      try {
        const decribeObject = await connection.describe(objectFullname);

        if (decribeObject.fields.length > 0) {
          const worksheet = XLSX.utils.json_to_sheet(decribeObject.fields);
          XLSX.utils.book_append_sheet(workbook, worksheet, objectFullname);
        }
      } catch (error) {
        continue;
      }
    }

    XLSX.writeFileXLSX(workbook, 'ObjectDefinition_' + new Date().toISOString().replace(/[:.]/g, '-') + '.xlsx');

    return { result: true };
  }
}
