/* eslint-disable complexity */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
// import { Field } from 'jsforce/describe-result.js';
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
    const indexSheetData = [
      {
        '#': '',
        オブジェクト: '',
        リンク: '',
      },
    ];
    const indexSheet = XLSX.utils.json_to_sheet(indexSheetData);
    XLSX.utils.book_append_sheet(workbook, indexSheet, 'Index');

    let index = 1;
    for (const objectFullname of objectFullnames) {
      this.log(`Processing object: ${objectFullname} (${index++}/${objectFullnames.length})`);

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
    タイプ: metadata.type || '',
    文字数: metadata.length
      ? metadata.length.toString()
      : metadata.type === 'double'
      ? metadata.precision.toString() + ' (' + metadata.scale.toString() + ')'
      : '',
    必須: metadata.nillable === false,
    一意: metadata.unique === true,
    参照先オブジェクト: Array.isArray(metadata.referenceTo) ? metadata.referenceTo.join(', ') : '',
    選択リスト値: '',
    デフォルト値: metadata.defaultValue?.toString() ?? '',
    数式: metadata.calculatedFormula ?? '',
    ヘルプデスク: metadata.inlineHelpText ?? '',
  };

  if (metadata.type === 'picklist' && metadata.picklistValues) {
    customField.選択リスト値 = metadata.picklistValues
      ? metadata.picklistValues.map((value) => value.label + ' (' + value.value + ')').join(', ')
      : '';
  }

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
