// Предупреждаем и о неполном номере: лучше лишний вопрос, чем пропуск.
export function hasPersonalData(value = '') {
  return /(?:\+?\d[\d\s()\-]{5,}\d)/u.test(value) && (value.match(/\d/g) || []).length >= 7 || /(?:^|\s)(?:ул\.|улица|проспект|переулок|дом\s+\d)\s*\S+/iu.test(value)
}
