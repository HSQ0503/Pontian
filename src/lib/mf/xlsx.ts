import { shortDate } from "./format";
import { groupItems } from "./registry";
import { RISK, sectionOf, STATUS } from "./sections";
import type { AtaItem, Project, Subsection } from "./types";
import { writeZip } from "./zip";

// Same columns and bilingual cells as MF's Registro Geral, so rows paste straight in.
const COLUMNS = ["Item", "Origem", "Data", "Prédio", "Assunto / Subject", "Status", "Resp.", "Prazo / Due", "Risco / Risk"];
const WIDTHS = [10, 12, 10, 8, 84, 16, 18, 12, 10];
const LETTERS = "ABCDEFGHI";

enum Style {
  Text = 1,
  Header = 2,
  Section = 3,
  Title = 4,
  Center = 5,
}

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");

function cell(ref: string, value: string, style: Style) {
  return `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${escape(value)}</t></is></c>`;
}

function row(index: number, values: string[], styles: Style[] | Style) {
  const cells = values.map((value, col) =>
    cell(`${LETTERS[col]}${index}`, value, Array.isArray(styles) ? styles[col] : styles),
  );
  return `<row r="${index}">${cells.join("")}</row>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font><font><b/><sz val="12"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF000000"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE9E9E9"/></patternFill></fill></fills>
<borders count="2"><border/><border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom></border></borders>
<cellStyleXfs count="1"><xf/></cellStyleXfs>
<cellXfs count="6"><xf/>
<xf fontId="0" borderId="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf fontId="3" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf fontId="1" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf fontId="2" applyFont="1"/>
<xf fontId="0" borderId="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
</cellXfs></styleSheet>`;

export function registryWorkbook(project: Project, title: string, items: AtaItem[], subsections: Subsection[]) {
  const rows: string[] = [];
  let index = 1;
  const merges: string[] = [];
  const titleRow = (text: string, style: Style) => {
    rows.push(row(index, [text], style));
    merges.push(`A${index}:I${index}`);
    index++;
  };

  titleRow(`ON ${project.on} - ${project.client.toUpperCase()}`, Style.Title);
  titleRow(project.name.toUpperCase(), Style.Title);
  titleRow(project.city.toUpperCase(), Style.Title);
  titleRow(title, Style.Title);
  index++;
  rows.push(row(index++, COLUMNS, Style.Header));
  const headerRow = index - 1;

  const center = [Style.Center, Style.Center, Style.Center, Style.Center, Style.Text, Style.Center, Style.Center, Style.Center, Style.Center];
  for (const group of groupItems(items, subsections)) {
    const section = sectionOf(group.section);
    rows.push(row(index, [String(group.section), "", "", "", `${section.pt.toUpperCase()}\n${section.en.toUpperCase()}`, "", "", "", ""], Style.Section));
    index++;
    for (const { sub, items: subItems } of group.subsections) {
      rows.push(row(index++, [sub.code, "", "", "", `${sub.pt}\n${sub.en}`, "", "", "", ""], Style.Section));
      for (const item of subItems) {
        rows.push(
          row(
            index++,
            [
              item.number,
              item.origins.join("\n"),
              shortDate(item.firstDate),
              item.building || "-",
              `${item.pt}\n\n${item.en}`,
              `${STATUS[item.status].pt}\n${STATUS[item.status].en}`,
              item.responsible || "-",
              item.deadlineHistory.filter(Boolean).map(shortDate).join("\n") || "-",
              RISK[item.risk].pt,
            ],
            center,
          ),
        );
      }
    }
  }

  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRow}" topLeftCell="A${headerRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${WIDTHS.map((width, i) => `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`).join("")}</cols>
<sheetData>${rows.join("")}</sheetData>
<autoFilter ref="A${headerRow}:I${Math.max(headerRow, index - 1)}"/>
<mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>
</worksheet>`;

  const sheetName = `${project.on}-RG`.slice(0, 31);
  return writeZip(
    [
      {
        path: "[Content_Types].xml",
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
      },
      {
        path: "_rels/.rels",
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      },
      {
        path: "xl/workbook.xml",
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escape(sheetName)}" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${escape(sheetName)}'!$A$${headerRow}:$I$${Math.max(headerRow, index - 1)}</definedName></definedNames></workbook>`,
      },
      {
        path: "xl/_rels/workbook.xml.rels",
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      },
      { path: "xl/styles.xml", content: STYLES },
      { path: "xl/worksheets/sheet1.xml", content: sheet },
    ],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}
