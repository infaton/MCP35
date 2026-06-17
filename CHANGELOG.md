# Changelog

Все значимые изменения документируются здесь.
Формат: [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).
Версионирование: [Semantic Versioning](https://semver.org/lang/ru/).

---

## [2.1.0] — 2026-05-14

### Добавлено
- **Группа З — Бухгалтерия, аудит, формы (10 новых инструментов):**
  - `get_balance` — остатки и обороты регистра бухгалтерии (любой план счетов)
  - `get_register_totals` — итоги регистров накопления
  - `get_accounting_entries` — бухгалтерские проводки документа (Дт/Кт/Сумма)
  - `get_related_documents` — цепочка связанных документов (ввод на основании)
  - `validate_document` — проверка заполнения документа без проведения
  - `get_form_structure` — структура управляемой формы (реквизиты, команды)
  - `get_rights` — права доступа текущего пользователя к объекту
  - `find_duplicates` — поиск дублей в справочниках по реквизитам
  - `get_print_form` — печатные формы через подсистему УправлениеПечатью
  - `get_configuration_extensions` — список расширений конфигурации (CFE)

### Исправлено
- **P1** `get_list` — добавлен `ПЕРВЫЕ N` (limit), ранее возвращал все записи
- **P2** `get_document_list` — исправлена передача дат через `УстановитьПараметр`
- **P3** `get_object_by_ref` — добавлена проверка `ЗначениеЗаполнено(Ссылка)` перед обращением к платформе
- **P4** `get_active_users` / `get_locks` — переход на `ПолучитьСеансыИнформационнойБазы()` вместо прямого обхода коллекции
- **P5** `get_event_log` — исправлена передача дат (теперь через `ПреобразоватьДату`) и поле метаданных (`.МетаданныеПредставление`)
- **P6** `ПреобразоватьДату` — полная перезапись: поддержка ISO 8601, `DD.MM.YYYY`, `YYYYMMDD`
- **P7** `fill_on_basis` — исправлен вызов метода (`ЗаполнитьНаОсновании` вместо `Заполнить`)
- **P8** `execute_batch` — исправлена бесконечная рекурсия при вложенных вызовах (guard-флаг `_batch_depth`)
- **P9** Версия обновлена с 2.0.0 до 2.1.0 во всех местах

---

## [2.0.0] — 2026-05-08

### Добавлено
- **Группа Ж — Расширенные операции (6 новых инструментов):**
  - `fill_on_basis` — заполнение документа на основании другого
  - `write_register_records` — запись набора записей регистра сведений
  - `update_tabular_section` — обновление табличной части (replace/append/update_by_index)
  - `subscribe_events` — polling-based подписка на события журнала регистрации
  - `execute_batch` — пакетное выполнение инструментов (последовательное/транзакционное)
  - `get_changes_since` — Change Data Capture: объекты, изменённые после метки времени

---

## [1.0.0] — 2026-04-28

### Добавлено
- Первый публичный релиз INFATON MCP Server
- **35 инструментов** в 6 группах:
  - Группа А — Метаданные (8): `get_metadata_tree`, `get_object_metadata`, `get_object_attributes`, `get_object_tabular_sections`, `get_enum_values`, `get_register_dimensions`, `get_document_movements`, `search_metadata`
  - Группа Б — Чтение данных (7): `execute_query`, `get_object_by_ref`, `get_list`, `find_by_code`, `find_by_name`, `get_register_records`, `get_document_list`
  - Группа В — CRUD (7): `create_object`, `update_object`, `delete_object`, `post_document`, `unpost_document`, `copy_object`, `set_attribute`
  - Группа Г — Код и отчёты (4): `execute_code`, `evaluate_expression`, `get_module_text`, `generate_report`
  - Группа Д — Администрирование (6): `get_active_users`, `get_event_log`, `get_locks`, `get_server_info`, `check_references`, `run_scheduled_job`
  - Группа Е — Интеграция (3): `exchange_execute`, `get_exchange_log`, `import_data`
- Расширение конфигурации `INFATON_MCP.cfe` для 1С:Предприятие 8.3.20+
- Поддержка конфигураций: ERP 2.5, УПП 1.3, Бухгалтерия 3.0, УТ 11, КА 2
- Node.js stdio-обёртка `index.mjs` для Claude Desktop, Cursor и других MCP-клиентов
- Протокол MCP версии 2024-11-05
- Регистрация в каталоге [Glama.ai](https://glama.ai/mcp/servers/infaton/MCP35)
- Лицензия MIT
