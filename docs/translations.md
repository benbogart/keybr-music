# Translations

keybr.com is available in several languages, such as English, German, Spanish, etc.
It is also constantly changing, we add new strings, update the existing ones.
We are unable to keep the quality of the translations on our own, without help from the contributors. So we are asking for your help to translate keybr.com into your language.

You can contribute as little as a small spelling fix, or as much as a complete website translation. Translating keybr.com does not require any programming skills. Everything is done in the simple and intuitive UI of a third party tool, [poeditor.com](https://poeditor.com/).

Start contributing by visiting [the translation project page](https://poeditor.com/join/project/MI55lGihyN). Create a contributor account, if you don't have one. Select an existing language, or suggest a new one. You will be presented with a table of strings to be translated. On the left you will see the original strings in English. On the right there will be your translations. Just fill in the text fields with your translations, that's it.

A few more tips.

Use [the filter field](https://poeditor.com/kb/how-to-filter-strings-localization-project) to quickly find the strings to be translated.

<img src="assets/pic1.png">

When an original English string changes it becomes [fuzzy](https://poeditor.com/kb/fuzzy-translations), and its translations need to be updated accordingly. It is a good idea to search for fuzzy strings.

<img src="assets/pic2.png">

The number of translated and untranslated messages and words can be seen in the [Translations Report](./translations_report.md)

## Rules for adding new user-facing text

When adding new copy in code, use these rules to prevent broken output in translated locales:

- Do **not** put Markdown links (`[text](url)` or `<https://...>`) into translatable messages.
- Keep links in JSX/HTML markup, and keep translation strings to plain text only.
- For sentence fragments around a link, translate only the plain text fragments and render the link element separately.
- Before merging, verify the new text in at least one non-English locale to ensure no placeholder or markdown artifacts appear in the UI.

Thank you for your contributions!
