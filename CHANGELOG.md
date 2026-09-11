# Changelog

Все значимые изменения документируются здесь.
Формат: [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).
Версионирование: [Semantic Versioning](https://semver.org/lang/ru/).

---

## [6.2.1] — 2026-09-09

### Исправлено
- **Безопасная запись составных ссылок по GUID.** Для реквизита с несколькими ссылочными типами
  сервер проверяет существование объекта в каждом разрешённом типе и только затем возвращает ссылку.
  Несуществующий GUID отклоняется; первый тип больше не выбирается вслепую.

---

## [6.2.0] — 2026-09-07

### Добавлено
- **`fill_counterparty_by_inn`** — реквизиты контрагента по ИНН штатным сервисом 1С
  (1С:Контрагент / ЕГРЮЛ-ЕГРИП): наименование, полное наименование, КПП, ОГРН, адрес,
  руководитель, статус. Только ЧТЕНИЕ госданных, в 1С не пишет. Инструментов стало 93.

---

## [6.1.0] — 2026-09-02

### Добавлено
- **`get_config_fingerprint`** — дешёвый отпечаток состава конфигурации (менялась ли конфигурация)
  без выгрузки в файлы: группы метаданных, объекты, реквизиты, формы за ~0,3–0,4 с.

---

## [6.0.2] — 2026-07-29

Крупное обновление: **59 → 91 инструмент** (+32). Запись ссылочных полей и перечислений, отчёты СКД под типовые конфигурации 1С:ERP, аудит прав, снимки состояния и сравнение метаданных.

> Часть платформы **INFATON** — цифровые двойники и AI-агенты над 1С:ERP.
> Компания: [infaton.ru](https://infaton.ru) · Продукт: [chatmcp.ru](https://chatmcp.ru) (ChatMCP — чат-двойник над вашей 1С:ERP).

### Добавлено (32 инструмента)
- **Отчёты и вызовы (СКД):** `run_report`, `get_report_options`, `save_report_variant`, `list_data_processors`, `run_data_processor`, `call_object_method`, `call_function`, `top_register`
- **Права и аудит:** `get_rights_for_user`, `assign_role_to_user`, `export_role_matrix`
- **Пользовательские настройки:** `set_user_setting`, `set_constant`, `set_functional_option`, `get_functional_option_map`, `load_extension`, `delete_extension`
- **Расширения и модули:** `get_extension_modules`, `get_form_module_text`, `compare_metadata_to_extension`, `get_subscription_handlers`
- **Снимки и цепочки:** `snapshot_document_state`, `compare_snapshots`, `document_chain`, `simulate_fill_on_basis`, `get_document_commands`
- **Регламент/обмен:** `get_scheduled_jobs`, `get_exchange_plans`
- **Бизнес-данные 1С:ERP:** `get_stock_by_warehouse`, `get_reservation_status`, `get_unfulfilled_order_lines`, `get_business_process_tasks`

### Изменено / исправлено
- **Запись ссылочных полей и перечислений:** резолв `_guid` работает для ссылок ШАПКИ и строк ТАБЛИЧНЫХ ЧАСТЕЙ (раньше ссылка строки ТЧ тихо терялась); `set_attribute` на реквизит-перечисление принимает значение по имени/синониму; ошибки записи больше не глушатся молча.
- **run_report:** нормализация выражений параметров схемы (через `Вычислить()`) и внешние функции СКД — типовые отчёты ЕРП (продажи/выручка/рентабельность) больше не падают.
- Статанализ bsl-language-server: `ТекущаяДата()` → `ТекущаяДатаСеанса()` (снят DeprecatedCurrentDate).

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
