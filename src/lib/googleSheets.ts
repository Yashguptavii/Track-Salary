import { getAccessToken } from './firebase';

export interface DriveSheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  // Check if it's a full URL
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Otherwise assume it's already an ID
  return trimmed;
}

export async function fetchDriveSpreadsheets(): Promise<DriveSheetFile[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google');

  const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,webViewLink)&pageSize=20&orderBy=modifiedTime desc`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to fetch sheets (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
}

export async function fetchSpreadsheetData(spreadsheetId: string, sheetName?: string): Promise<{
  title: string;
  sheetNames: string[];
  selectedSheet: string;
  rows: (string | number)[][];
}> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google');

  // First fetch metadata to get sheet names
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!metaRes.ok) {
    const errorData = await metaRes.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Could not open spreadsheet (${metaRes.status})`);
  }

  const metaData = await metaRes.json();
  const title = metaData.properties?.title || 'Google Sheet';
  const sheetNames: string[] = (metaData.sheets || []).map((s: { properties: { title: string } }) => s.properties.title);

  const targetSheet = sheetName || sheetNames[0] || 'Sheet1';

  // Now fetch values from target sheet
  const encodedRange = encodeURIComponent(targetSheet);
  const valuesRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueRenderOption=FORMATTED_VALUE`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!valuesRes.ok) {
    const errorData = await valuesRes.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Could not read sheet data (${valuesRes.status})`);
  }

  const valuesData = await valuesRes.json();
  const rows: (string | number)[][] = valuesData.values || [];

  return {
    title,
    sheetNames,
    selectedSheet: targetSheet,
    rows,
  };
}
