/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable complexity */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import XLSX from 'xlsx';
import { Field } from '@jsforce/jsforce-node';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-tools', 'generate.object.definition');

export type GenerateObjectDefinitionResult = {
  result: boolean;
};

type CustomField = {
  '#': number;
  ラベル: string;
  API名: string;
  タイプ: string;
  文字数: string;
  必須: boolean;
  一意: boolean;
  参照先オブジェクト: string;
  選択リスト値: string;
  デフォルト値: string;
  数式: string;
  ヘルプデスク: string;
  名前項目: boolean;
  制限付き選択リスト: boolean; // Optional field for restricted picklist
};

export default class GenerateObjectDefinition extends SfCommand<GenerateObjectDefinitionResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'target-objects': Flags.string({
      summary: messages.getMessage('flags.target-objects.summary'),
    }),
  };

  public async run(): Promise<GenerateObjectDefinitionResult> {
    const { flags } = await this.parse(GenerateObjectDefinition);
    const orgId = flags['target-org'].getOrgId();
    const connection = flags['target-org'].getConnection('64.0');

    this.log(`Connected to ${flags['target-org'].getUsername()} (${orgId}) with API version ${connection.version}`);

    let objectFullnames: string[] = [];
    if (!flags['target-objects']) {
      const metadata = await connection.metadata.list([{ type: 'CustomObject', folder: null }]);
      objectFullnames = metadata.map((sobject) => sobject.fullName);
    } else {
      objectFullnames = flags['target-objects'].split(',');
    }

    objectFullnames.sort();

    const workbook = XLSX.utils.book_new();

    const indexLines = [];

    let index: number = 1;
    for (const objectFullname of objectFullnames) {
      this.log(`Processing object: ${objectFullname} (${index++}/${objectFullnames.length})`);
      const indexLine = {
        '#': index - 1,
        オブジェクト名: objectFullname,
      };
      indexLines.push(indexLine);

      try {
        const decribeObject = await connection.describe(objectFullname);
        const fields = [];

        let i = 1;
        if (decribeObject.fields.length > 0) {
          const sortedFields = decribeObject.fields.sort((a, b) => a.name.localeCompare(b.name));
          for (const f of sortedFields) {
            const customField = convertMetadata(f, i++);
            fields.push(customField);
          }
        } else {
          const customField = {
            '#': '',
            ラベル: '',
            API名: '',
            タイプ: '',
            文字数: '',
            必須: null,
            一意: null,
            参照先オブジェクト: '',
            選択リスト値: '',
            デフォルト値: '',
            数式: '',
            ヘルプデスク: '',
            名前項目: '',
            制限付き選択リスト: '',
          };
          fields.push(customField);
        }

        const worksheet = XLSX.utils.json_to_sheet(fields);
        XLSX.utils.book_append_sheet(workbook, worksheet, objectFullname);
      } catch (error) {
        this.log(`Cannot retrieved the following object: ${objectFullname}`);
        continue;
      }
    }

    const indexSheet = XLSX.utils.json_to_sheet(indexLines);

    for (let i = 0; i < indexLines.length; i++) {
      indexSheet['B' + (i + 2)].l = { Target: '#' + indexSheet['B' + (i + 2)].v + '!A1' };
    }

    XLSX.utils.book_append_sheet(workbook, indexSheet, 'Index');
    const sheetNames = workbook.SheetNames;

    const sheetToMove = sheetNames.splice(sheetNames.length - 1, 1)[0];
    sheetNames.unshift(sheetToMove);
    workbook.SheetNames = sheetNames;

    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0].replace(/-/g, '');
    XLSX.writeFileXLSX(workbook, 'ObjectDefinition_' + formattedDate + '.xlsx');

    return { result: true };
  }
}

function convertMetadata(metadata: Field, index: number): CustomField {
  const customField: CustomField = {
    '#': index, // Placeholder, will be set later
    ラベル: metadata.label || '',
    API名: metadata.name || '',
    タイプ: metadata.calculatedFormula ? 'formula (' + metadata.type + ')' : metadata.type || '',
    文字数: metadata.length
      ? metadata.length.toString()
      : metadata.type === 'double'
      ? metadata.precision.toString() + ' (' + metadata.scale.toString() + ')'
      : '',
    必須: metadata.nillable === false,
    一意: metadata.unique === true,
    参照先オブジェクト: Array.isArray(metadata.referenceTo) ? metadata.referenceTo.join(', ') : '',
    選択リスト値:
      metadata.type === 'picklist' && metadata.picklistValues
        ? metadata.picklistValues
          ? metadata.picklistValues.map((value) => value.label + ' (' + value.value + ')').join(', ')
          : ''
        : '',
    デフォルト値: metadata.defaultValue?.toString() ?? '',
    数式: metadata.calculatedFormula ?? '',
    ヘルプデスク: metadata.inlineHelpText ?? '',
    名前項目: metadata.nameField ? true : false,
    制限付き選択リスト: metadata.restrictedPicklist ? true : false, // Optional field for restricted picklist
  };

  return customField;
}

// Field: {
//     aggregatable: boolean;
//     autoNumber: boolean;
//     byteLength: number;
//     calculated: boolean;
//     calculatedFormula: Optional<string>;
//     cascadeDelete: boolean;
//     caseSensitive: boolean;
//     compoundFieldName: Optional<string>;
//     controllerName: Optional<string>;
//     createable: boolean;
//     custom: boolean;
//     defaultValue: Optional<string>;
//     defaultValueFormula: Optional<string>;
//     defaultedOnCreate: boolean;
//     dependentPicklist: boolean;
//     deprecatedAndHidden: boolean;
//     digits: number;
//     displayLocationInDecimal: boolean;
//     encrypted: boolean;
//     externalId: boolean;
//     extraTypeInfo: Optional<string>;
//     filterable: boolean;
//     filteredLookupInfo: object;
//     groupable: boolean;
//     highScaleNumber: boolean;
//     htmlFormatted: boolean;
//     idLookup: boolean;
//     inlineHelpText: Optional<string>;
//     label: string;
//     length: number;
//     mask: Optional<string>;
//     maskType: Optional<string>;
//     name: string;
//     nameField: boolean;
//     namePointing: boolean;
//     nillable: boolean;
//     permissionable: boolean;
//     picklistValues: Optional<any[]>;
//     precision: number;
//     queryByDistance: boolean;
//     referenceTargetField: object;
//     referenceTo: Optional<string[]>;
//     relationshipName: Optional<string>;
//     relationshipOrder: Optional<number>;
//     restrictedDelete: boolean;
//     restrictedPicklist: boolean;
//     scale: number;
//     soapType: string;
//     sortable: boolean;
//     type: string;
//     unique: boolean;
//     updateable: boolean;
//     writeRequiresMasterRead: boolean;
// }
