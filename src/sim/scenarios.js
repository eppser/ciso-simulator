import defaultDay from '../../data/day-2026-09-02.json';
import { buildThreatModel } from './data.js';

export const BUILTIN_DAYS = [defaultDay];
export function validateDay(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.day || '') || !Number.isFinite(Date.parse(value.day)) || new Date(value.day).toISOString().slice(0, 10) !== value.day) throw new Error('A valid day in YYYY-MM-DD format is required.');
  if (!Array.isArray(value.vulnerabilities) || !value.vulnerabilities.length || value.vulnerabilities.length > 15000) throw new Error('Provide between 1 and 15,000 vulnerability rows.');
  const ids = new Set();
  for (const r of value.vulnerabilities) {
    const rowKey = JSON.stringify([r.id,r.vendor,r.product,r.device_class]);
    if (typeof r.id !== 'string' || !r.id.trim() || r.id.length > 180 || ids.has(rowKey)) throw new Error('Each vulnerability/product/class row must be unique and have a nonempty id.');
    ids.add(rowKey);
    for (const k of ['connections', 'unique_ips']) if (!Number.isSafeInteger(r[k]) || r[k] < (k === 'unique_ips' ? 1 : 0) || r[k] > 1e9) throw new Error(`${r.id}: ${k} must be a valid positive count.`);
    if (r.connections < r.unique_ips) throw new Error(`${r.id}: attempts cannot be lower than source counts.`);
    for (const k of ['vendor', 'product', 'device_class', 'description']) if (r[k] != null && (typeof r[k] !== 'string' || r[k].length > 20000)) throw new Error(`${r.id}: invalid ${k}.`);
    for(const [k,max]of [['cvss',10],['ss_score',10],['epss',1]])if(r[k]!=null&&(typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0||r[k]>max))throw new Error(`${r.id}: invalid ${k}.`);
  }
  return value;
}
export function scenarioModel(day) {
  validateDay(day);
  const counts=new Map();for(const r of day.vulnerabilities)counts.set(r.id,(counts.get(r.id)||0)+1);
  // CVEs can occur on multiple product rows. Keep each observation and disambiguate keys.
  return buildThreatModel({...day,vulnerabilities:day.vulnerabilities.map((r,i)=>({...r,id:counts.get(r.id)>1?`${r.id} / row ${i+1}`:r.id}))});
}
export function daySeed(day) { return Number(day.replaceAll('-', '')); }
