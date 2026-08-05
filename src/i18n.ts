// Language packs - the `@llselect/core/i18n` subpath entry. Pure data: each pack is
// a complete LLSelectTexts spreadable into the `texts` setting (`texts: zhTW`,
// or `texts: { ...zhTW, searchInputPlaceholder: '...' }` for per-key
// overrides). This module inlines only texts.ts, never base.ts, so importing
// a pack costs bytes, not behavior.
//
// Ordering: packs and the textsByLocale keys are sorted alphabetically by
// BCP 47 tag (CLDR convention; keeps diffs mechanical).
//
// Typography: the Chinese-script packs (zh-TW / zh-CN / yue / nan-TW) put a
// space between CJK and half-width characters (Pangu spacing); ja follows
// Japanese convention (no such spacing). ar / fa / he / ur strings are RTL;
// embedded Latin runs ("Esc") reorder via the Unicode Bidi Algorithm.
//
// Grammar traps deliberately avoided: languages that inflect around numerals
// or attach suffixes to interpolated words use invariant frames instead - an
// impersonal passive (Slavic "Vybrano n z t"), a label-colon form (kk / mn
// "Selected: n / t"), or a carrier noun taking the suffix (tr "X ogesini
// kaldir"); fr / es / it / pt / ro / sv / hi branch on chosenCount === 1.
//
// TRANSLATION STATUS:
// - user-vetted: zh-TW. Library source: en (texts.ts).
// - LLM-drafted, cross-reviewed by a second model, native sign-off pending:
//   all remaining packs. Within those, LOWER CONFIDENCE (review first if you
//   ship them prominently): ga, is, kk, mn, my, km, bn, ur, lt, lv, sw, ta,
//   yue.
// - nan-TW and nan-Latn-tailo are DRAFTS for the maintainer's own native
//   vetting; do not treat them as shipped-quality until this flag is removed.

import { en, type LLSelectTexts } from './texts.js'

export { en }
export type { LLSelectTexts } from './texts.js'

/** Arabic texts (RTL). */
export const ar: LLSelectTexts = {
  triggerPlaceholder: 'الرجاء الاختيار',
  searchInputAriaLabel: 'بحث',
  searchInputPlaceholder: 'تصفية (Esc للمسح)',
  popupListNoResults: 'لا توجد نتائج',
  triggerClearButtonAriaLabel: 'مسح التحديد',
  tagRemoveButtonAriaLabel: (itemLabel) => `إزالة ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `تم اختيار الكل (${chosenCount})` : `تم اختيار ${chosenCount} من ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `تحديد الكل (${chosenCount} من ${totalCount})`,
}

/** Bulgarian texts. */
export const bg: LLSelectTexts = {
  triggerPlaceholder: 'Изберете',
  searchInputAriaLabel: 'Търсене',
  searchInputPlaceholder: 'Филтър (Esc за изчистване)',
  popupListNoResults: 'Няма резултати',
  triggerClearButtonAriaLabel: 'Изчистване на избора',
  tagRemoveButtonAriaLabel: (itemLabel) => `Премахване на ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Избрани: всички (${chosenCount})` : `Избрани: ${chosenCount} от ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Избери всички (${chosenCount} / ${totalCount})`,
}

/** Bengali texts. */
export const bn: LLSelectTexts = {
  triggerPlaceholder: 'অনুগ্রহ করে নির্বাচন করুন',
  searchInputAriaLabel: 'অনুসন্ধান',
  searchInputPlaceholder: 'ফিল্টার (মুছতে Esc)',
  popupListNoResults: 'কোনো ফলাফল পাওয়া যায়নি',
  triggerClearButtonAriaLabel: 'নির্বাচন মুছুন',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel} সরান`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `সব ${chosenCount}টি নির্বাচিত` : `${totalCount}টির মধ্যে ${chosenCount}টি নির্বাচিত`,
  selectAllRowLabel: (chosenCount, totalCount) => `সব নির্বাচন করুন (${chosenCount} / ${totalCount})`,
}

/** Catalan texts. */
export const ca: LLSelectTexts = {
  triggerPlaceholder: 'Seleccioneu una opció',
  searchInputAriaLabel: 'Cerca',
  searchInputPlaceholder: 'Filtra (Esc per esborrar)',
  popupListNoResults: 'Cap resultat',
  triggerClearButtonAriaLabel: 'Esborra la selecció',
  tagRemoveButtonAriaLabel: (itemLabel) => `Suprimeix ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `1 de ${totalCount} seleccionat` }
    if (chosenCount === totalCount) { return `Tots els ${chosenCount} seleccionats` }
    return `${chosenCount} de ${totalCount} seleccionats`
  },
  selectAllRowLabel: (chosenCount, totalCount) => `Selecciona-ho tot (${chosenCount} de ${totalCount})`,
}

/** Czech texts. */
export const cs: LLSelectTexts = {
  triggerPlaceholder: 'Vyberte',
  searchInputAriaLabel: 'Hledat',
  searchInputPlaceholder: 'Filtr (Esc pro vymazání)',
  popupListNoResults: 'Žádné výsledky',
  triggerClearButtonAriaLabel: 'Vymazat výběr',
  tagRemoveButtonAriaLabel: (itemLabel) => `Odebrat ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Vybráno vše (${chosenCount})` : `Vybráno ${chosenCount} z ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Vybrat vše (${chosenCount} / ${totalCount})`,
}

/** Danish texts. */
export const da: LLSelectTexts = {
  triggerPlaceholder: 'Vælg en mulighed',
  searchInputAriaLabel: 'Søg',
  searchInputPlaceholder: 'Filtrer (Esc for at rydde)',
  popupListNoResults: 'Ingen resultater',
  triggerClearButtonAriaLabel: 'Ryd valget',
  tagRemoveButtonAriaLabel: (itemLabel) => `Fjern ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Alle ${chosenCount} valgt` : `${chosenCount} af ${totalCount} valgt`,
  selectAllRowLabel: (chosenCount, totalCount) => `Vælg alle (${chosenCount} / ${totalCount})`,
}

/** German texts. */
export const de: LLSelectTexts = {
  triggerPlaceholder: 'Bitte auswählen',
  searchInputAriaLabel: 'Suchen',
  searchInputPlaceholder: 'Filtern (Esc zum Löschen)',
  popupListNoResults: 'Keine Treffer',
  triggerClearButtonAriaLabel: 'Auswahl löschen',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel} entfernen`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Alle ${chosenCount} ausgewählt` : `${chosenCount} von ${totalCount} ausgewählt`,
  selectAllRowLabel: (chosenCount, totalCount) => `Alle auswählen (${chosenCount} / ${totalCount})`,
}

/** Greek texts. */
export const el: LLSelectTexts = {
  triggerPlaceholder: 'Επιλέξτε',
  searchInputAriaLabel: 'Αναζήτηση',
  searchInputPlaceholder: 'Φίλτρο (Esc για καθαρισμό)',
  popupListNoResults: 'Κανένα αποτέλεσμα',
  triggerClearButtonAriaLabel: 'Καθαρισμός επιλογής',
  tagRemoveButtonAriaLabel: (itemLabel) => `Αφαίρεση ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `Επιλέχθηκε 1 από ${totalCount}` }
    if (chosenCount === totalCount) { return `Επιλέχθηκαν όλα (${chosenCount})` }
    return `Επιλέχθηκαν ${chosenCount} από ${totalCount}`
  },
  selectAllRowLabel: (chosenCount, totalCount) => `Επιλογή όλων (${chosenCount} / ${totalCount})`,
}

/** Spanish texts (unsplit: these strings do not differ across regions). */
export const es: LLSelectTexts = {
  triggerPlaceholder: 'Seleccione una opción',
  searchInputAriaLabel: 'Buscar',
  searchInputPlaceholder: 'Filtrar (Esc para borrar)',
  popupListNoResults: 'Sin resultados',
  triggerClearButtonAriaLabel: 'Borrar la selección',
  tagRemoveButtonAriaLabel: (itemLabel) => `Quitar ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `1 de ${totalCount} seleccionado` }
    if (chosenCount === totalCount) { return `Todos los ${chosenCount} seleccionados` }
    return `${chosenCount} de ${totalCount} seleccionados`
  },
  selectAllRowLabel: (chosenCount, totalCount) => `Seleccionar todo (${chosenCount} de ${totalCount})`,
}

/** Estonian texts. */
export const et: LLSelectTexts = {
  triggerPlaceholder: 'Valige',
  searchInputAriaLabel: 'Otsi',
  searchInputPlaceholder: 'Filtreeri (Esc tühjendab)',
  popupListNoResults: 'Tulemusi pole',
  triggerClearButtonAriaLabel: 'Tühjenda valik',
  tagRemoveButtonAriaLabel: (itemLabel) => `Eemalda ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Kõik valitud (${chosenCount})` : `Valitud ${chosenCount} / ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Vali kõik (${chosenCount} / ${totalCount})`,
}

/** Persian texts (RTL). */
export const fa: LLSelectTexts = {
  triggerPlaceholder: 'لطفاً انتخاب کنید',
  searchInputAriaLabel: 'جستجو',
  searchInputPlaceholder: 'فیلتر (Esc برای پاک کردن)',
  popupListNoResults: 'نتیجه‌ای یافت نشد',
  triggerClearButtonAriaLabel: 'پاک کردن انتخاب',
  tagRemoveButtonAriaLabel: (itemLabel) => `حذف ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `همه انتخاب شدند (${chosenCount})` : `${chosenCount} از ${totalCount} انتخاب شده`,
  selectAllRowLabel: (chosenCount, totalCount) => `انتخاب همه (${chosenCount} از ${totalCount})`,
}

/** Finnish texts. */
export const fi: LLSelectTexts = {
  triggerPlaceholder: 'Valitse',
  searchInputAriaLabel: 'Haku',
  searchInputPlaceholder: 'Suodata (Esc tyhjentää)',
  popupListNoResults: 'Ei tuloksia',
  triggerClearButtonAriaLabel: 'Tyhjennä valinta',
  tagRemoveButtonAriaLabel: (itemLabel) => `Poista ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Kaikki ${chosenCount} valittu` : `${chosenCount} / ${totalCount} valittu`,
  selectAllRowLabel: (chosenCount, totalCount) => `Valitse kaikki (${chosenCount} / ${totalCount})`,
}

/** Filipino texts. */
export const fil: LLSelectTexts = {
  triggerPlaceholder: 'Pumili',
  searchInputAriaLabel: 'Maghanap',
  searchInputPlaceholder: 'Salain (Esc para burahin)',
  popupListNoResults: 'Walang resulta',
  triggerClearButtonAriaLabel: 'Burahin ang pinili',
  tagRemoveButtonAriaLabel: (itemLabel) => `Alisin ang ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Napili lahat (${chosenCount})` : `${chosenCount} sa ${totalCount} ang napili`,
  selectAllRowLabel: (chosenCount, totalCount) => `Piliin lahat (${chosenCount} / ${totalCount})`,
}

/** French texts. */
export const fr: LLSelectTexts = {
  triggerPlaceholder: 'Veuillez sélectionner',
  searchInputAriaLabel: 'Rechercher',
  searchInputPlaceholder: 'Filtrer (Échap pour effacer)',
  popupListNoResults: 'Aucun résultat',
  triggerClearButtonAriaLabel: 'Effacer la sélection',
  tagRemoveButtonAriaLabel: (itemLabel) => `Retirer ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `1 sur ${totalCount} sélectionné` }
    if (chosenCount === totalCount) { return `Tous les ${chosenCount} sélectionnés` }
    return `${chosenCount} sur ${totalCount} sélectionnés`
  },
  selectAllRowLabel: (chosenCount, totalCount) => `Tout sélectionner (${chosenCount} / ${totalCount})`,
}

/** Irish texts. */
export const ga: LLSelectTexts = {
  triggerPlaceholder: 'Roghnaigh',
  searchInputAriaLabel: 'Cuardaigh',
  searchInputPlaceholder: 'Scag (Esc le glanadh)',
  popupListNoResults: 'Gan torthaí',
  triggerClearButtonAriaLabel: 'Glan an rogha',
  tagRemoveButtonAriaLabel: (itemLabel) => `Bain ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Gach ceann roghnaithe (${chosenCount})` : `${chosenCount} as ${totalCount} roghnaithe`,
  selectAllRowLabel: (chosenCount, totalCount) => `Roghnaigh uile (${chosenCount} / ${totalCount})`,
}

/** Hebrew texts (RTL). */
export const he: LLSelectTexts = {
  triggerPlaceholder: 'נא לבחור',
  searchInputAriaLabel: 'חיפוש',
  searchInputPlaceholder: 'סינון (Esc לניקוי)',
  popupListNoResults: 'לא נמצאו תוצאות',
  triggerClearButtonAriaLabel: 'נקה בחירה',
  tagRemoveButtonAriaLabel: (itemLabel) => `הסר ${itemLabel}`,
  // Hebrew number agreement: singular past (nivchar) for 1, plural (nivcheru)
  // otherwise; the all-chosen form needs the noun (kol X ha-pritim).
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `נבחר פריט אחד מתוך ${totalCount}` }
    if (chosenCount === totalCount) { return `נבחרו כל ${totalCount} הפריטים` }
    return `נבחרו ${chosenCount} מתוך ${totalCount}`
  },
  selectAllRowLabel: (chosenCount, totalCount) => `בחר הכל (${chosenCount} מתוך ${totalCount})`,
}

/** Hindi texts. */
export const hi: LLSelectTexts = {
  triggerPlaceholder: 'कृपया चुनें',
  searchInputAriaLabel: 'खोजें',
  searchInputPlaceholder: 'फ़िल्टर (साफ़ करने के लिए Esc)',
  popupListNoResults: 'कोई परिणाम नहीं मिला',
  triggerClearButtonAriaLabel: 'चयन साफ़ करें',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel} हटाएँ`,
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `${totalCount} में से 1 चुना गया` }
    if (chosenCount === totalCount) { return `सभी ${chosenCount} चुने गए` }
    return `${totalCount} में से ${chosenCount} चुने गए`
  },
  selectAllRowLabel: (chosenCount, totalCount) => `सभी चुनें (${chosenCount} / ${totalCount})`,
}

/** Croatian texts. */
export const hr: LLSelectTexts = {
  triggerPlaceholder: 'Odaberite',
  searchInputAriaLabel: 'Pretraži',
  searchInputPlaceholder: 'Filtriraj (Esc za brisanje)',
  popupListNoResults: 'Nema rezultata',
  triggerClearButtonAriaLabel: 'Očisti odabir',
  tagRemoveButtonAriaLabel: (itemLabel) => `Ukloni ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Odabrano sve (${chosenCount})` : `Odabrano ${chosenCount} od ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Odaberi sve (${chosenCount} / ${totalCount})`,
}

/** Hungarian texts. */
export const hu: LLSelectTexts = {
  triggerPlaceholder: 'Válasszon',
  searchInputAriaLabel: 'Keresés',
  searchInputPlaceholder: 'Szűrés (Esc: törlés)',
  popupListNoResults: 'Nincs találat',
  triggerClearButtonAriaLabel: 'Kijelölés törlése',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel} eltávolítása`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Összes kijelölve (${chosenCount})` : `${chosenCount} / ${totalCount} kijelölve`,
  selectAllRowLabel: (chosenCount, totalCount) => `Összes kijelölése (${chosenCount} / ${totalCount})`,
}

/** Indonesian texts. */
export const id: LLSelectTexts = {
  triggerPlaceholder: 'Silakan pilih',
  searchInputAriaLabel: 'Cari',
  searchInputPlaceholder: 'Saring (Esc untuk menghapus)',
  popupListNoResults: 'Tidak ada hasil',
  triggerClearButtonAriaLabel: 'Hapus pilihan',
  tagRemoveButtonAriaLabel: (itemLabel) => `Hapus ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Semua dipilih (${chosenCount})` : `${chosenCount} dari ${totalCount} dipilih`,
  selectAllRowLabel: (chosenCount, totalCount) => `Pilih semua (${chosenCount} / ${totalCount})`,
}

/** Icelandic texts. */
export const is: LLSelectTexts = {
  triggerPlaceholder: 'Veldu valkost',
  searchInputAriaLabel: 'Leita',
  searchInputPlaceholder: 'Sía (Esc til að hreinsa)',
  popupListNoResults: 'Engar niðurstöður',
  triggerClearButtonAriaLabel: 'Hreinsa val',
  tagRemoveButtonAriaLabel: (itemLabel) => `Fjarlægja ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Allt valið (${chosenCount})` : `${chosenCount} af ${totalCount} valið`,
  selectAllRowLabel: (chosenCount, totalCount) => `Velja allt (${chosenCount} / ${totalCount})`,
}

/** Italian texts. */
export const it: LLSelectTexts = {
  triggerPlaceholder: 'Seleziona un elemento',
  searchInputAriaLabel: 'Cerca',
  searchInputPlaceholder: 'Filtra (Esc per cancellare)',
  popupListNoResults: 'Nessun risultato',
  triggerClearButtonAriaLabel: 'Cancella la selezione',
  tagRemoveButtonAriaLabel: (itemLabel) => `Rimuovi ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `1 su ${totalCount} selezionato` }
    if (chosenCount === totalCount) { return `Tutti i ${chosenCount} selezionati` }
    return `${chosenCount} su ${totalCount} selezionati`
  },
  selectAllRowLabel: (chosenCount, totalCount) => `Seleziona tutto (${chosenCount} / ${totalCount})`,
}

/** Japanese texts. */
export const ja: LLSelectTexts = {
  triggerPlaceholder: '選択してください',
  searchInputAriaLabel: '検索',
  searchInputPlaceholder: '絞り込み（Escでクリア）',
  popupListNoResults: '該当する結果はありません',
  triggerClearButtonAriaLabel: '選択をクリア',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel}を削除`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `全${chosenCount}件を選択中` : `${totalCount}件中${chosenCount}件を選択中`,
  selectAllRowLabel: (chosenCount, totalCount) => `すべて選択（${chosenCount} / ${totalCount}）`,
}

/** Kazakh texts (Cyrillic). */
export const kk: LLSelectTexts = {
  triggerPlaceholder: 'Таңдаңыз',
  searchInputAriaLabel: 'Іздеу',
  searchInputPlaceholder: 'Сүзгі (тазарту үшін Esc)',
  popupListNoResults: 'Нәтиже табылмады',
  triggerClearButtonAriaLabel: 'Таңдауды тазарту',
  // Label-colon frames: Kazakh case suffixes vary with the stem, so nothing
  // is suffixed onto the interpolated label or numerals.
  tagRemoveButtonAriaLabel: (itemLabel) => `Алып тастау: ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Барлығы таңдалды (${chosenCount})` : `Таңдалды: ${chosenCount} / ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Барлығын таңдау (${chosenCount} / ${totalCount})`,
}

/** Khmer texts. */
export const km: LLSelectTexts = {
  triggerPlaceholder: 'សូមជ្រើសរើស',
  searchInputAriaLabel: 'ស្វែងរក',
  searchInputPlaceholder: 'ត្រង (Esc ដើម្បីសម្អាត)',
  popupListNoResults: 'គ្មានលទ្ធផល',
  triggerClearButtonAriaLabel: 'សម្អាតការជ្រើសរើស',
  tagRemoveButtonAriaLabel: (itemLabel) => `ដក ${itemLabel} ចេញ`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `បានជ្រើសរើសទាំងអស់ (${chosenCount})` : `បានជ្រើសរើស ${chosenCount} ក្នុងចំណោម ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `ជ្រើសរើសទាំងអស់ (${chosenCount} / ${totalCount})`,
}

/** Korean texts. */
export const ko: LLSelectTexts = {
  triggerPlaceholder: '선택하세요',
  searchInputAriaLabel: '검색',
  searchInputPlaceholder: '필터 (Esc로 지우기)',
  popupListNoResults: '결과가 없습니다',
  triggerClearButtonAriaLabel: '선택 지우기',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel} 제거`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `전체 ${chosenCount}개 선택됨` : `${totalCount}개 중 ${chosenCount}개 선택됨`,
  selectAllRowLabel: (chosenCount, totalCount) => `모두 선택 (${chosenCount} / ${totalCount})`,
}

/** Lithuanian texts. */
export const lt: LLSelectTexts = {
  triggerPlaceholder: 'Pasirinkite',
  searchInputAriaLabel: 'Paieška',
  searchInputPlaceholder: 'Filtras (Esc išvalyti)',
  popupListNoResults: 'Rezultatų nerasta',
  triggerClearButtonAriaLabel: 'Išvalyti pasirinkimą',
  tagRemoveButtonAriaLabel: (itemLabel) => `Pašalinti ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Pasirinkta viskas (${chosenCount})` : `Pasirinkta ${chosenCount} iš ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Pasirinkti viską (${chosenCount} / ${totalCount})`,
}

/** Latvian texts. */
export const lv: LLSelectTexts = {
  triggerPlaceholder: 'Izvēlieties',
  searchInputAriaLabel: 'Meklēt',
  searchInputPlaceholder: 'Filtrs (Esc notīra)',
  popupListNoResults: 'Nav rezultātu',
  triggerClearButtonAriaLabel: 'Notīrīt izvēli',
  tagRemoveButtonAriaLabel: (itemLabel) => `Noņemt ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Izvēlēts: viss (${chosenCount})` : `Izvēlēts: ${chosenCount} no ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Izvēlēties visu (${chosenCount} / ${totalCount})`,
}

/** Mongolian texts (Cyrillic; the traditional script needs vertical layout and is out of scope). */
export const mn: LLSelectTexts = {
  triggerPlaceholder: 'Сонгоно уу',
  searchInputAriaLabel: 'Хайх',
  searchInputPlaceholder: 'Шүүлтүүр (цэвэрлэхийн тулд Esc)',
  popupListNoResults: 'Илэрц олдсонгүй',
  triggerClearButtonAriaLabel: 'Сонголтыг арилгах',
  // Label-colon frame: Mongolian case suffixes vary with the stem (vowel
  // harmony), so nothing is suffixed onto the interpolated label.
  tagRemoveButtonAriaLabel: (itemLabel) => `Хасах: ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Бүгд сонгогдсон (${chosenCount})` : `Сонгосон: ${chosenCount} / ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Бүгдийг сонгох (${chosenCount} / ${totalCount})`,
}

/** Malay texts. */
export const ms: LLSelectTexts = {
  triggerPlaceholder: 'Sila pilih',
  searchInputAriaLabel: 'Cari',
  searchInputPlaceholder: 'Tapis (Esc untuk kosongkan)',
  popupListNoResults: 'Tiada hasil',
  triggerClearButtonAriaLabel: 'Kosongkan pilihan',
  tagRemoveButtonAriaLabel: (itemLabel) => `Alih keluar ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Semua dipilih (${chosenCount})` : `${chosenCount} daripada ${totalCount} dipilih`,
  selectAllRowLabel: (chosenCount, totalCount) => `Pilih semua (${chosenCount} / ${totalCount})`,
}

/** Burmese texts. */
export const my: LLSelectTexts = {
  triggerPlaceholder: 'ရွေးချယ်ပါ',
  searchInputAriaLabel: 'ရှာဖွေရန်',
  searchInputPlaceholder: 'စစ်ထုတ်ရန် (ရှင်းရန် Esc)',
  popupListNoResults: 'ရလဒ် မရှိပါ',
  triggerClearButtonAriaLabel: 'ရွေးချယ်မှု ရှင်းလင်းရန်',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel} ကို ဖယ်ရှားရန်`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `အားလုံး ရွေးထားသည် (${chosenCount})` : `${totalCount} ခုအနက် ${chosenCount} ခု ရွေးထားသည်`,
  selectAllRowLabel: (chosenCount, totalCount) => `အားလုံး ရွေးရန် (${chosenCount} / ${totalCount})`,
}

/**
 * Taiwanese Hokkien texts (Tai-lo romanization; IANA variant subtag `tailo`).
 * DRAFT - see TRANSLATION STATUS: needs the maintainer's native vetting.
 * Same language as `nan-TW`, distinguished by script (`Latn`) + variant, not
 * by a separate language id.
 */
export const nanLatnTailo: LLSelectTexts = {
  triggerPlaceholder: 'Tshiánn kíng-suán',
  searchInputAriaLabel: 'Tshiau-tshuē',
  searchInputPlaceholder: 'Kuè-lī (tshi̍h Esc tshing-tiāu)',
  popupListNoResults: 'Tshuē bô kiat-kó',
  triggerClearButtonAriaLabel: 'Tshing-tiāu kíng--ê',
  tagRemoveButtonAriaLabel: (itemLabel) => `Kā ${itemLabel} the̍h-tiāu`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Tsuân-pōo ${chosenCount} hāng lóng kíng--ah` : `${totalCount} hāng kíng ${chosenCount} hāng`,
  selectAllRowLabel: (chosenCount, totalCount) => `Lóng-tsóng kíng (${chosenCount} / ${totalCount})`,
}

/**
 * Taiwanese Hokkien texts (Taiwan; Han script, MOE recommended characters).
 * DRAFT - see TRANSLATION STATUS: needs the maintainer's native vetting.
 */
export const nanTW: LLSelectTexts = {
  triggerPlaceholder: '請揀選',
  searchInputAriaLabel: '搜揣',
  searchInputPlaceholder: '過濾（揤 Esc 清掉）',
  popupListNoResults: '揣無結果',
  triggerClearButtonAriaLabel: '清掉揀的',
  tagRemoveButtonAriaLabel: (itemLabel) => `共 ${itemLabel} 提掉`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `全部 ${chosenCount} 項攏揀矣` : `${totalCount} 項揀 ${chosenCount} 項`,
  selectAllRowLabel: (chosenCount, totalCount) => `攏總揀（${chosenCount} / ${totalCount}）`,
}

/** Norwegian Bokmål texts (`no` resolves here in textsByLocale). */
export const nb: LLSelectTexts = {
  triggerPlaceholder: 'Velg et alternativ',
  searchInputAriaLabel: 'Søk',
  searchInputPlaceholder: 'Filtrer (Esc for å tømme)',
  popupListNoResults: 'Ingen treff',
  triggerClearButtonAriaLabel: 'Tøm valget',
  tagRemoveButtonAriaLabel: (itemLabel) => `Fjern ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Alle ${chosenCount} valgt` : `${chosenCount} av ${totalCount} valgt`,
  selectAllRowLabel: (chosenCount, totalCount) => `Velg alle (${chosenCount} / ${totalCount})`,
}

/** Dutch texts. */
export const nl: LLSelectTexts = {
  triggerPlaceholder: 'Maak een keuze',
  searchInputAriaLabel: 'Zoeken',
  searchInputPlaceholder: 'Filteren (Esc om te wissen)',
  popupListNoResults: 'Geen resultaten',
  triggerClearButtonAriaLabel: 'Selectie wissen',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel} verwijderen`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Alle ${chosenCount} geselecteerd` : `${chosenCount} van ${totalCount} geselecteerd`,
  selectAllRowLabel: (chosenCount, totalCount) => `Alles selecteren (${chosenCount} / ${totalCount})`,
}

/** Polish texts. */
export const pl: LLSelectTexts = {
  triggerPlaceholder: 'Wybierz',
  searchInputAriaLabel: 'Szukaj',
  searchInputPlaceholder: 'Filtruj (Esc, aby wyczyścić)',
  popupListNoResults: 'Brak wyników',
  triggerClearButtonAriaLabel: 'Wyczyść wybór',
  tagRemoveButtonAriaLabel: (itemLabel) => `Usuń ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Wybrano wszystkie (${chosenCount})` : `Wybrano ${chosenCount} z ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Zaznacz wszystko (${chosenCount} / ${totalCount})`,
}

/** Portuguese texts (unsplit: vocabulary valid in both European and Brazilian usage). */
export const pt: LLSelectTexts = {
  triggerPlaceholder: 'Selecione uma opção',
  searchInputAriaLabel: 'Pesquisar',
  searchInputPlaceholder: 'Filtrar (Esc para limpar)',
  popupListNoResults: 'Nenhum resultado',
  triggerClearButtonAriaLabel: 'Limpar seleção',
  tagRemoveButtonAriaLabel: (itemLabel) => `Remover ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `1 de ${totalCount} selecionado` }
    if (chosenCount === totalCount) { return `Todos os ${chosenCount} selecionados` }
    return `${chosenCount} de ${totalCount} selecionados`
  },
  selectAllRowLabel: (chosenCount, totalCount) => `Selecionar tudo (${chosenCount} de ${totalCount})`,
}

/** Romanian texts. */
export const ro: LLSelectTexts = {
  triggerPlaceholder: 'Selectați',
  searchInputAriaLabel: 'Căutare',
  searchInputPlaceholder: 'Filtrare (Esc pentru golire)',
  popupListNoResults: 'Niciun rezultat',
  triggerClearButtonAriaLabel: 'Golește selecția',
  tagRemoveButtonAriaLabel: (itemLabel) => `Elimină ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `1 din ${totalCount} selectat` }
    if (chosenCount === totalCount) { return `Toate cele ${chosenCount} selectate` }
    return `${chosenCount} din ${totalCount} selectate`
  },
  selectAllRowLabel: (chosenCount, totalCount) => `Selectează tot (${chosenCount} / ${totalCount})`,
}

/** Russian texts. */
export const ru: LLSelectTexts = {
  triggerPlaceholder: 'Выберите',
  searchInputAriaLabel: 'Поиск',
  searchInputPlaceholder: 'Фильтр (Esc, чтобы очистить)',
  popupListNoResults: 'Ничего не найдено',
  triggerClearButtonAriaLabel: 'Очистить выбор',
  tagRemoveButtonAriaLabel: (itemLabel) => `Удалить ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Выбраны все (${chosenCount})` : `Выбрано ${chosenCount} из ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Выбрать все (${chosenCount} из ${totalCount})`,
}

/** Slovak texts. */
export const sk: LLSelectTexts = {
  triggerPlaceholder: 'Vyberte',
  searchInputAriaLabel: 'Hľadať',
  searchInputPlaceholder: 'Filter (Esc na vymazanie)',
  popupListNoResults: 'Žiadne výsledky',
  triggerClearButtonAriaLabel: 'Vymazať výber',
  tagRemoveButtonAriaLabel: (itemLabel) => `Odstrániť ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Vybrané: všetko (${chosenCount})` : `Vybrané: ${chosenCount} z ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Vybrať všetko (${chosenCount} / ${totalCount})`,
}

/** Slovenian texts. */
export const sl: LLSelectTexts = {
  triggerPlaceholder: 'Izberite',
  searchInputAriaLabel: 'Iskanje',
  searchInputPlaceholder: 'Filtriraj (Esc za brisanje)',
  popupListNoResults: 'Ni rezultatov',
  triggerClearButtonAriaLabel: 'Počisti izbor',
  tagRemoveButtonAriaLabel: (itemLabel) => `Odstrani ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Izbrano vse (${chosenCount})` : `Izbrano ${chosenCount} od ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Izberi vse (${chosenCount} / ${totalCount})`,
}

/** Serbian texts (Cyrillic). */
export const sr: LLSelectTexts = {
  triggerPlaceholder: 'Изаберите',
  searchInputAriaLabel: 'Претрага',
  searchInputPlaceholder: 'Филтер (Esc за брисање)',
  popupListNoResults: 'Нема резултата',
  triggerClearButtonAriaLabel: 'Обриши избор',
  tagRemoveButtonAriaLabel: (itemLabel) => `Уклони ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Изабрано све (${chosenCount})` : `Изабрано ${chosenCount} од ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Изабери све (${chosenCount} / ${totalCount})`,
}

/** Swedish texts. */
export const sv: LLSelectTexts = {
  triggerPlaceholder: 'Välj ett alternativ',
  searchInputAriaLabel: 'Sök',
  searchInputPlaceholder: 'Filtrera (Esc för att rensa)',
  popupListNoResults: 'Inga resultat',
  triggerClearButtonAriaLabel: 'Rensa valet',
  tagRemoveButtonAriaLabel: (itemLabel) => `Ta bort ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `1 av ${totalCount} vald` }
    if (chosenCount === totalCount) { return `Alla ${chosenCount} valda` }
    return `${chosenCount} av ${totalCount} valda`
  },
  selectAllRowLabel: (chosenCount, totalCount) => `Välj alla (${chosenCount} / ${totalCount})`,
}

/** Swahili texts. */
export const sw: LLSelectTexts = {
  triggerPlaceholder: 'Tafadhali chagua',
  searchInputAriaLabel: 'Tafuta',
  searchInputPlaceholder: 'Chuja (Esc kufuta)',
  popupListNoResults: 'Hakuna matokeo',
  triggerClearButtonAriaLabel: 'Futa uteuzi',
  tagRemoveButtonAriaLabel: (itemLabel) => `Ondoa ${itemLabel}`,
  // Personal-subject frame ("you have selected"): the passive would need
  // noun-class agreement with an unknown item class.
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Umechagua zote (${chosenCount})` : `Umechagua ${chosenCount} kati ya ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Chagua zote (${chosenCount} / ${totalCount})`,
}

/** Tamil texts. */
export const ta: LLSelectTexts = {
  triggerPlaceholder: 'தேர்ந்தெடுக்கவும்',
  searchInputAriaLabel: 'தேடல்',
  searchInputPlaceholder: 'வடிகட்டு (அழிக்க Esc)',
  popupListNoResults: 'முடிவுகள் இல்லை',
  triggerClearButtonAriaLabel: 'தேர்வை அழி',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel} ஐ அகற்று`,
  // Tamil number agreement: neuter singular -athu for 1, plural -ana otherwise.
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `${totalCount} இல் 1 தேர்ந்தெடுக்கப்பட்டது` }
    if (chosenCount === totalCount) { return `அனைத்தும் தேர்ந்தெடுக்கப்பட்டன (${chosenCount})` }
    return `${totalCount} இல் ${chosenCount} தேர்ந்தெடுக்கப்பட்டன`
  },
  selectAllRowLabel: (chosenCount, totalCount) => `அனைத்தையும் தேர்ந்தெடு (${chosenCount} / ${totalCount})`,
}

/** Thai texts. */
export const th: LLSelectTexts = {
  triggerPlaceholder: 'โปรดเลือก',
  searchInputAriaLabel: 'ค้นหา',
  searchInputPlaceholder: 'กรอง (กด Esc เพื่อล้าง)',
  popupListNoResults: 'ไม่พบผลลัพธ์',
  triggerClearButtonAriaLabel: 'ล้างการเลือก',
  tagRemoveButtonAriaLabel: (itemLabel) => `นำ ${itemLabel} ออก`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `เลือกแล้วทั้งหมด (${chosenCount})` : `เลือกแล้ว ${chosenCount} จาก ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `เลือกทั้งหมด (${chosenCount} / ${totalCount})`,
}

/** Turkish texts. */
export const tr: LLSelectTexts = {
  triggerPlaceholder: 'Lütfen seçin',
  searchInputAriaLabel: 'Ara',
  searchInputPlaceholder: 'Filtrele (temizlemek için Esc)',
  popupListNoResults: 'Sonuç bulunamadı',
  triggerClearButtonAriaLabel: 'Seçimi temizle',
  // The case suffix lands on the carrier noun "oge" (item), never on the
  // interpolated label (Turkish suffixes vary with vowel harmony).
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel} öğesini kaldır`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Tümü seçildi (${chosenCount})` : `${chosenCount} / ${totalCount} seçildi`,
  selectAllRowLabel: (chosenCount, totalCount) => `Tümünü seç (${chosenCount} / ${totalCount})`,
}

/** Ukrainian texts. */
export const uk: LLSelectTexts = {
  triggerPlaceholder: 'Виберіть',
  searchInputAriaLabel: 'Пошук',
  searchInputPlaceholder: 'Фільтр (Esc, щоб очистити)',
  popupListNoResults: 'Нічого не знайдено',
  triggerClearButtonAriaLabel: 'Очистити вибір',
  tagRemoveButtonAriaLabel: (itemLabel) => `Вилучити ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Вибрано всі (${chosenCount})` : `Вибрано ${chosenCount} з ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Вибрати всі (${chosenCount} / ${totalCount})`,
}

/** Urdu texts (RTL). */
export const ur: LLSelectTexts = {
  triggerPlaceholder: 'براہ کرم منتخب کریں',
  searchInputAriaLabel: 'تلاش',
  searchInputPlaceholder: 'فلٹر (صاف کرنے کے لیے Esc)',
  popupListNoResults: 'کوئی نتیجہ نہیں ملا',
  triggerClearButtonAriaLabel: 'انتخاب صاف کریں',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel} ہٹائیں`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `سب منتخب (${chosenCount})` : `${totalCount} میں سے ${chosenCount} منتخب`,
  selectAllRowLabel: (chosenCount, totalCount) => `سب منتخب کریں (${chosenCount} / ${totalCount})`,
}

/** Vietnamese texts. */
export const vi: LLSelectTexts = {
  triggerPlaceholder: 'Vui lòng chọn',
  searchInputAriaLabel: 'Tìm kiếm',
  searchInputPlaceholder: 'Lọc (Esc để xóa)',
  popupListNoResults: 'Không có kết quả',
  triggerClearButtonAriaLabel: 'Xóa lựa chọn',
  tagRemoveButtonAriaLabel: (itemLabel) => `Bỏ ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Đã chọn tất cả ${chosenCount}` : `Đã chọn ${chosenCount} / ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Chọn tất cả (${chosenCount} / ${totalCount})`,
}

/**
 * Cantonese texts (written VERNACULAR Cantonese, Hong Kong). Deliberately a
 * different register from `zh-HK` (which is formal written Chinese and
 * aliases to `zh-TW`): pick `yue` only when the product speaks colloquial
 * Cantonese on purpose.
 */
export const yue: LLSelectTexts = {
  triggerPlaceholder: '請揀',
  searchInputAriaLabel: '搜尋',
  searchInputPlaceholder: '篩選（撳 Esc 清走）',
  popupListNoResults: '搵唔到結果',
  triggerClearButtonAriaLabel: '清走揀咗嘅嘢',
  tagRemoveButtonAriaLabel: (itemLabel) => `移走 ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `全部 ${chosenCount} 項都揀咗` : `${totalCount} 項揀咗 ${chosenCount} 項`,
  selectAllRowLabel: (chosenCount, totalCount) => `全部揀晒（${chosenCount} / ${totalCount}）`,
}

/** Simplified Chinese (mainland) texts. */
export const zhCN: LLSelectTexts = {
  triggerPlaceholder: '请选择',
  searchInputAriaLabel: '搜索',
  searchInputPlaceholder: '筛选（按 Esc 清除）',
  popupListNoResults: '没有匹配的结果',
  triggerClearButtonAriaLabel: '清除选择',
  tagRemoveButtonAriaLabel: (itemLabel) => `移除 ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `已选全部 ${chosenCount} 项` : `已选 ${chosenCount} / ${totalCount} 项`,
  selectAllRowLabel: (chosenCount, totalCount) => `全选（${chosenCount} / ${totalCount}）`,
}

/** Traditional Chinese (Taiwan) texts (`zh-HK` resolves here in textsByLocale). */
export const zhTW: LLSelectTexts = {
  triggerPlaceholder: '請選擇',
  searchInputAriaLabel: '搜尋',
  searchInputPlaceholder: '篩選（按 Esc 清除）',
  popupListNoResults: '沒有符合的結果',
  triggerClearButtonAriaLabel: '清除選擇',
  tagRemoveButtonAriaLabel: (itemLabel) => `移除 ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `已選全部 ${chosenCount} 項` : `已選 ${chosenCount} / ${totalCount} 項`,
  selectAllRowLabel: (chosenCount, totalCount) => `全選（${chosenCount} / ${totalCount}）`,
}

/**
 * All packs keyed by their BCP 47 tag, for `navigator.language`-style lookup.
 * - Tags are the MINIMAL sufficient form (BCP 47 / CLDR convention): `ja` and
 *   `en` carry no region (the strings are not region-specific); `zh-TW` /
 *   `zh-CN` must (Traditional vs Simplified differ entirely); `en` / `es` /
 *   `pt` are deliberately unsplit (these strings do not differ by region).
 *   Named exports stay camelCase (`zhTW`, `nanTW`) only because `-` is
 *   illegal in a JS identifier.
 * - Alias keys map onto another tag's pack object: `no` -> `nb` (macrolanguage
 *   tag browsers still report), `zh-HK` -> `zh-TW` (formal written Chinese;
 *   these strings do not differ - written VERNACULAR Cantonese is the
 *   separate primary tag `yue`).
 * - Script / orthography variants of one language differ by subtag, not by
 *   language id: `nan-TW` (Han) vs `nan-Latn-tailo` (Tai-lo romanization).
 * - Browsers may report longer or different tags (`en-GB`, `ja-JP`,
 *   `zh-Hant-TW`), so negotiate instead of indexing blindly - e.g. try the
 *   full tag, then the base language, then fall back:
 *   `textsByLocale[tag] ?? textsByLocale[tag.split('-')[0]!] ?? en`.
 */
export const textsByLocale: Record<string, LLSelectTexts> = {
  ar,
  bg,
  bn,
  ca,
  cs,
  da,
  de,
  el,
  en,
  es,
  et,
  fa,
  fi,
  fil,
  fr,
  ga,
  he,
  hi,
  hr,
  hu,
  id,
  is,
  it,
  ja,
  kk,
  km,
  ko,
  lt,
  lv,
  mn,
  ms,
  my,
  'nan-Latn-tailo': nanLatnTailo,
  'nan-TW': nanTW,
  nb,
  nl,
  no: nb,
  pl,
  pt,
  ro,
  ru,
  sk,
  sl,
  sr,
  sv,
  sw,
  ta,
  th,
  tr,
  uk,
  ur,
  vi,
  yue,
  'zh-CN': zhCN,
  'zh-HK': zhTW,
  'zh-TW': zhTW,
}
