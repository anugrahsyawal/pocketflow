import { DEFAULT_POCKETS } from '../../data/defaultPockets';
import type { SetupRequest } from './sessionClient';

export function buildSetupRequest(keys: string[], cash: string, nfc: string, id: string): SetupRequest {
  if (!keys.length || new Set(keys).size !== keys.length || keys.some(key => !DEFAULT_POCKETS.some(p => p.id === key))) {
    throw new Error('Pilih minimal satu pocket dari daftar.');
  }
  if (keys.includes('cash') && !keys.includes('food-groceries')) throw new Error('Cash membutuhkan Food & Groceries sebagai pemilik budget.');
  if (keys.includes('nfc-card') && !keys.includes('transportation')) throw new Error('NFC membutuhkan Transportation sebagai pemilik budget.');
  const amount = (value: string, label: string) => {
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error(`Saldo ${label} harus berupa rupiah bulat, nol atau lebih, tanpa tanda pemisah.`);
    return Number(value);
  };
  return {clientMutationId:id,selectedPocketKeys:[...keys],
    ...(keys.includes('cash') ? {cashOpeningBalance:amount(cash,'Cash')} : {}),
    ...(keys.includes('nfc-card') ? {nfcOpeningBalance:amount(nfc,'NFC')} : {})};
}
