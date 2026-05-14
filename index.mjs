#!/usr/bin/env node
/**
 * INFATON MCP35 — stdio MCP server (proxy to 1C:Enterprise HTTP service)
 * 
 * This Node.js wrapper implements the MCP stdio transport (JSON-RPC 2.0 over stdin/stdout).
 * It proxies all tool calls to a running 1C:Enterprise HTTP service.
 * 
 * Environment variables:
 *   ONEC_URL      — Base URL of the 1C HTTP service, e.g. http://server/base/hs/mcp
 *   ONEC_USER     — 1C username (optional)
 *   ONEC_PASSWORD  — 1C password (optional)
 * 
 * Without ONEC_URL, the server responds to initialize and tools/list
 * but returns an error for tools/call (demo/inspection mode).
 */

import { createInterface } from 'readline';

const ONEC_URL = process.env.ONEC_URL || '';
const ONEC_USER = process.env.ONEC_USER || '';
const ONEC_PASSWORD = process.env.ONEC_PASSWORD || '';

// ─── 35 tool definitions ────────────────────────────────────────────────

function str(description) {
  return { type: 'string', description };
}

const TOOLS = [
  // Group A: Metadata (8)
  {
    name: 'get_metadata_tree',
    description: 'Получить дерево метаданных конфигурации 1С. Возвращает список всех объектов по типам: справочники, документы, регистры, перечисления и т.д. Используй для обзора структуры базы.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_object_metadata',
    description: 'Получить подробные метаданные объекта 1С: реквизиты, табличные части, формы, макеты, движения. Используй для анализа структуры конкретного объекта.',
    inputSchema: { type: 'object', properties: { full_name: str('Полное имя объекта метаданных, например: Справочник.Номенклатура, Документ.РеализацияТоваровУслуг') }, required: ['full_name'] }
  },
  {
    name: 'get_object_attributes',
    description: 'Получить список реквизитов объекта с типами, синонимами и длиной. Используй для понимания полей при чтении/записи данных.',
    inputSchema: { type: 'object', properties: { full_name: str('Полное имя объекта, например: Справочник.Контрагенты') }, required: ['full_name'] }
  },
  {
    name: 'get_object_tabular_sections',
    description: 'Получить табличные части объекта и их реквизиты. Используй для анализа строковых данных документов и справочников.',
    inputSchema: { type: 'object', properties: { full_name: str('Полное имя объекта, например: Документ.ПоступлениеТоваровУслуг') }, required: ['full_name'] }
  },
  {
    name: 'get_enum_values',
    description: 'Получить все значения перечисления с именами и синонимами.',
    inputSchema: { type: 'object', properties: { full_name: str('Полное имя перечисления, например: Перечисление.ВидыНоменклатуры') }, required: ['full_name'] }
  },
  {
    name: 'get_register_dimensions',
    description: 'Получить измерения, ресурсы и реквизиты регистра. Используй для понимания структуры регистров.',
    inputSchema: { type: 'object', properties: { full_name: str('Полное имя регистра, например: РегистрСведений.КурсыВалют, РегистрНакопления.ТоварыНаСкладах') }, required: ['full_name'] }
  },
  {
    name: 'get_document_movements',
    description: 'Получить список регистров, по которым документ делает движения (проводки). Ключевой инструмент для анализа учёта.',
    inputSchema: { type: 'object', properties: { full_name: str('Полное имя документа, например: Документ.РеализацияТоваровУслуг') }, required: ['full_name'] }
  },
  {
    name: 'search_metadata',
    description: 'Поиск объектов метаданных по подстроке в имени или синониме. Используй когда не знаешь точное имя объекта.',
    inputSchema: { type: 'object', properties: { query: str('Строка поиска по имени или синониму объекта метаданных'), type_filter: str('Фильтр по типу: Справочник, Документ, Регистр, Перечисление, ПВХ, ПланСчетов (необязательно)') }, required: ['query'] }
  },
  // Group B: Data reading (7)
  {
    name: 'execute_query',
    description: 'Выполнить произвольный запрос на языке запросов 1С. Самый мощный инструмент чтения данных. Поддерживает ВЫБРАТЬ, соединения, группировки, параметры виртуальных таблиц.',
    inputSchema: { type: 'object', properties: { query: str('Текст запроса на языке 1С'), max_results: { type: 'integer', description: 'Максимальное количество строк результата (по умолчанию 100)' } }, required: ['query'] }
  },
  {
    name: 'get_object_by_ref',
    description: 'Получить полные данные объекта по его типу и UUID: все реквизиты, табличные части, проведён ли, пометка удаления.',
    inputSchema: { type: 'object', properties: { full_name: str('Тип объекта, например: Справочник.Номенклатура, Документ.РеализацияТоваровУслуг'), guid: str('UUID объекта') }, required: ['full_name', 'guid'] }
  },
  {
    name: 'get_list',
    description: 'Получить список объектов заданного типа с пагинацией и фильтром. Возвращает код, наименование и UUID.',
    inputSchema: { type: 'object', properties: { full_name: str('Тип объекта, например: Справочник.Контрагенты'), filter: str('Строка фильтра (необязательно)'), limit: { type: 'integer', description: 'Количество записей (по умолчанию 50)' }, offset: { type: 'integer', description: 'Смещение для пагинации (по умолчанию 0)' } }, required: ['full_name'] }
  },
  {
    name: 'find_by_code',
    description: 'Найти объект по коду. Возвращает данные найденного элемента или сообщение что не найден.',
    inputSchema: { type: 'object', properties: { full_name: str('Тип объекта, например: Справочник.Номенклатура'), code: str('Код объекта') }, required: ['full_name', 'code'] }
  },
  {
    name: 'find_by_name',
    description: 'Найти объект по наименованию. Возвращает данные найденного элемента.',
    inputSchema: { type: 'object', properties: { full_name: str('Тип объекта, например: Справочник.Контрагенты'), name: str('Наименование объекта') }, required: ['full_name', 'name'] }
  },
  {
    name: 'get_register_records',
    description: 'Получить записи регистра с фильтрацией по измерениям и периоду. Работает с регистрами сведений, накопления и бухгалтерии.',
    inputSchema: { type: 'object', properties: { full_name: str('Полное имя регистра, например: РегистрСведений.КурсыВалют'), filter: str('JSON-объект фильтра по измерениям (необязательно)'), period_from: str('Начало периода YYYYMMDD (необязательно)'), period_to: str('Конец периода YYYYMMDD (необязательно)'), limit: { type: 'integer', description: 'Количество записей (по умолчанию 100)' } }, required: ['full_name'] }
  },
  {
    name: 'get_document_list',
    description: 'Получить список документов заданного типа с фильтрацией по периоду и статусу проведения.',
    inputSchema: { type: 'object', properties: { full_name: str('Тип документа, например: Документ.ПоступлениеТоваровУслуг'), date_from: str('Начало периода YYYYMMDD (необязательно)'), date_to: str('Конец периода YYYYMMDD (необязательно)'), posted_only: { type: 'boolean', description: 'Только проведённые (по умолчанию false)' }, limit: { type: 'integer', description: 'Количество (по умолчанию 50)' } }, required: ['full_name'] }
  },
  // Group C: CRUD (7)
  {
    name: 'create_object',
    description: 'Создать новый элемент справочника или документ. Для ссылочных реквизитов передавай UUID со суффиксом _guid.',
    inputSchema: { type: 'object', properties: { full_name: str('Тип объекта, например: Справочник.Номенклатура'), attributes: { type: 'object', description: 'JSON-объект с реквизитами нового объекта' }, tabular_sections: { type: 'object', description: 'JSON-объект с табличными частями (необязательно)' } }, required: ['full_name', 'attributes'] }
  },
  {
    name: 'update_object',
    description: 'Обновить реквизиты существующего объекта. Передавай только изменяемые поля.',
    inputSchema: { type: 'object', properties: { full_name: str('Тип объекта, например: Справочник.Номенклатура'), guid: str('UUID объекта'), attributes: { type: 'object', description: 'JSON-объект с изменяемыми реквизитами' } }, required: ['full_name', 'guid', 'attributes'] }
  },
  {
    name: 'delete_object',
    description: 'Установить/снять пометку удаления объекта. Физическое удаление НЕ выполняется.',
    inputSchema: { type: 'object', properties: { full_name: str('Тип объекта'), guid: str('UUID объекта'), unmark: { type: 'boolean', description: 'true — снять пометку удаления (по умолчанию false — пометить)' } }, required: ['full_name', 'guid'] }
  },
  {
    name: 'post_document',
    description: 'Провести документ. Формирует движения по регистрам.',
    inputSchema: { type: 'object', properties: { full_name: str('Тип документа, например: Документ.РеализацияТоваровУслуг'), guid: str('UUID документа') }, required: ['full_name', 'guid'] }
  },
  {
    name: 'unpost_document',
    description: 'Отменить проведение документа. Удаляет движения по регистрам.',
    inputSchema: { type: 'object', properties: { full_name: str('Тип документа'), guid: str('UUID документа') }, required: ['full_name', 'guid'] }
  },
  {
    name: 'copy_object',
    description: 'Создать копию объекта. Копирует все реквизиты и табличные части. Возвращает UUID нового объекта.',
    inputSchema: { type: 'object', properties: { full_name: str('Тип объекта-источника'), guid: str('UUID копируемого объекта') }, required: ['full_name', 'guid'] }
  },
  {
    name: 'set_attribute',
    description: 'Быстро изменить один реквизит объекта. Удобно для массовых точечных правок.',
    inputSchema: { type: 'object', properties: { full_name: str('Тип объекта'), guid: str('UUID объекта'), attribute_name: str('Имя реквизита'), value: str('Новое значение') }, required: ['full_name', 'guid', 'attribute_name', 'value'] }
  },
  // Group D: Code & Reports (4)
  {
    name: 'execute_code',
    description: 'Выполнить произвольный код на языке 1С. МОЩНЫЙ ИНСТРУМЕНТ. Код выполняется в привилегированном режиме. Результат должен быть в переменной Результат (строка). Используй когда другие инструменты не подходят.',
    inputSchema: { type: 'object', properties: { code: str('Текст кода на языке 1С') }, required: ['code'] }
  },
  {
    name: 'evaluate_expression',
    description: 'Вычислить выражение на языке 1С и вернуть результат. Для простых вычислений и проверок.',
    inputSchema: { type: 'object', properties: { expression: str('Выражение на языке 1С для вычисления, например: Формат(ТекущаяДата(), "ДФ=dd.MM.yyyy")') }, required: ['expression'] }
  },
  {
    name: 'get_module_text',
    description: 'Получить исходный текст модуля объекта конфигурации. Работает только если расширение имеет доступ к основной конфигурации.',
    inputSchema: { type: 'object', properties: { full_name: str('Полное имя объекта, например: Справочник.Номенклатура'), module_type: str('Тип модуля: ОбъектМодуль, МодульМенеджера, МодульФормы (по умолчанию ОбъектМодуль)') }, required: ['full_name'] }
  },
  {
    name: 'generate_report',
    description: 'Сформировать простой отчёт по произвольному запросу. Возвращает табличные данные.',
    inputSchema: { type: 'object', properties: { query: str('Текст запроса для отчёта'), title: str('Заголовок отчёта (необязательно)') }, required: ['query'] }
  },
  // Group E: Administration (4)
  {
    name: 'get_active_users',
    description: 'Получить список активных сеансов пользователей в информационной базе.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_event_log',
    description: 'Получить записи журнала регистрации с фильтрацией по периоду, событию и пользователю. Ключевой инструмент диагностики.',
    inputSchema: { type: 'object', properties: { period_from: str('Начало периода YYYYMMDD (по умолчанию сегодня)'), period_to: str('Конец периода YYYYMMDD (по умолчанию сегодня)'), event_filter: str('Фильтр по событию (необязательно)'), user_filter: str('Фильтр по пользователю (необязательно)'), limit: { type: 'integer', description: 'Количество записей (по умолчанию 100)' } }, required: [] }
  },
  {
    name: 'get_locks',
    description: 'Получить текущие блокировки данных в информационной базе. Помогает диагностировать зависания и конфликты.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_server_info',
    description: 'Получить информацию о сервере: версия платформы, режим, имя базы, текущая дата/время.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  // Group F: Checks (2)
  {
    name: 'check_references',
    description: 'Найти все ссылки на объект в базе данных. Показывает где используется данный объект. Необходимо перед удалением.',
    inputSchema: { type: 'object', properties: { full_name: str('Тип объекта, например: Справочник.Номенклатура'), guid: str('UUID объекта') }, required: ['full_name', 'guid'] }
  },
  {
    name: 'run_scheduled_job',
    description: 'Запустить регламентное задание по имени. Выполняется немедленно в текущем сеансе.',
    inputSchema: { type: 'object', properties: { job_name: str('Имя регламентного задания для запуска') }, required: ['job_name'] }
  },
  // Group G: Data exchange (3)
  {
    name: 'exchange_execute',
    description: 'Выполнить обмен данными по указанному плану обмена и узлу.',
    inputSchema: { type: 'object', properties: { exchange_plan: str('Имя плана обмена'), node: str('Имя узла обмена (необязательно, по умолчанию первый узел)') }, required: ['exchange_plan'] }
  },
  {
    name: 'get_exchange_log',
    description: 'Получить журнал обменов данными: дата, план обмена, направление, результат.',
    inputSchema: { type: 'object', properties: { period_from: str('Начало периода YYYYMMDD (по умолчанию за последние 7 дней)'), period_to: str('Конец периода YYYYMMDD'), exchange_plan: str('Фильтр по плану обмена (необязательно)') }, required: [] }
  },
  {
    name: 'import_data',
    description: 'Массовый импорт данных из JSON-массива. Создаёт или обновляет объекты.',
    inputSchema: { type: 'object', properties: { full_name: str('Тип объекта для импорта, например: Справочник.Номенклатура'), data: { type: 'array', description: 'Массив JSON-объектов с данными для импорта', items: { type: 'object' } }, mode: str('Режим: create (по умолчанию), upsert, update') }, required: ['full_name', 'data'] }
  },
  // Group H: New tools v2.0 (6)
  {
    name: 'fill_on_basis',
    description: 'Создать новый документ/справочник на основании существующего объекта. Вызывает типовой механизм ЗаполнитьНаОсновании(). Ключевой для цепочек: ЗаказКлиента → Реализация → СчётФактура.',
    inputSchema: { type: 'object', properties: { target_type: str('Полное имя целевого объекта, например: Документ.РеализацияТоваровУслуг'), base_type: str('Полное имя объекта-основания, например: Документ.ЗаказКлиента'), base_guid: str('UUID объекта-основания'), attributes: { type: 'object', description: 'Дополнительные реквизиты для переопределения (необязательно)' } }, required: ['target_type', 'base_type', 'base_guid'] }
  },
  {
    name: 'write_register_records',
    description: 'Записать данные в регистр сведений напрямую. Поддерживает периодические и непериодические регистры. Для контактной информации, курсов валют, цен, штрихкодов.',
    inputSchema: { type: 'object', properties: { full_name: str('Полное имя регистра, например: РегистрСведений.КурсыВалют'), records: { type: 'array', description: 'Массив записей. Каждая запись — объект с измерениями, ресурсами и реквизитами', items: { type: 'object' } }, replace: { type: 'boolean', description: 'Режим замены: true — заменить по ключу, false — добавить (по умолчанию)' }, period: str('Период для периодических регистров (YYYYMMDD или ISO 8601)') }, required: ['full_name', 'records'] }
  },
  {
    name: 'update_tabular_section',
    description: 'Обновить табличную часть существующего объекта (документа/справочника). Три режима: replace (полная замена), append (добавление), update_by_index (по номеру строки).',
    inputSchema: { type: 'object', properties: { full_name: str('Полное имя объекта, например: Документ.ЗаказКлиента'), guid: str('UUID объекта'), tabular_section: str('Имя табличной части, например: Товары'), rows: { type: 'array', description: 'Массив строк ТЧ', items: { type: 'object' } }, mode: str('Режим: replace (по умолчанию), append, update_by_index') }, required: ['full_name', 'guid', 'tabular_section', 'rows'] }
  },
  {
    name: 'subscribe_events',
    description: 'Получить события (изменения) из журнала регистрации 1С с момента указанной метки. Polling-based CDC для синхронизации двойников. Возвращает watermark для следующего запроса.',
    inputSchema: { type: 'object', properties: { full_name: str('Фильтр по типу объекта (необязательно)'), event_types: str('Типы событий через запятую (необязательно)'), since: str('Метка времени ISO 8601 (по умолчанию 5 мин назад)'), max_events: { type: 'integer', description: 'Макс. кол-во событий (по умолчанию 100, макс. 1000)' } }, required: [] }
  },
  {
    name: 'execute_batch',
    description: 'Выполнить пакет операций за один HTTP-вызов. Поддерживает любые инструменты MCP. Режимы: последовательный, stop-on-error, транзакционный (атомарный). Макс. 50 операций.',
    inputSchema: { type: 'object', properties: { operations: { type: 'array', description: 'Массив операций: [{tool: "имя", arguments: {...}}, ...]', items: { type: 'object' } }, stop_on_error: { type: 'boolean', description: 'Остановить при ошибке (по умолчанию true)' }, transactional: { type: 'boolean', description: 'Атомарная транзакция — откат всех при ошибке (по умолчанию false)' } }, required: ['operations'] }
  },
  {
    name: 'get_changes_since',
    description: 'Получить список объектов, изменённых после указанной метки. Change Data Capture для синхронизации двойников. Возвращает GUID, тип изменения, время, watermark.',
    inputSchema: { type: 'object', properties: { full_name: str('Полное имя типа объекта, например: Документ.ЗаказКлиента'), since: str('Метка времени ISO 8601'), include_data: { type: 'boolean', description: 'Включить полные данные объектов (по умолчанию false)' }, max_results: { type: 'integer', description: 'Макс. результатов (по умолчанию 500, макс. 5000)' } }, required: ['full_name', 'since'] }
  }
];

// ─── JSON-RPC handler ───────────────────────────────────────────────────

async function handleRequest(msg) {
  const { method, id, params = {} } = msg;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'infaton-1c-mcp', version: '2.0.0' }
      }
    };
  }

  if (method === 'notifications/initialized') {
    return null; // notification, no response
  }

  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
  }

  if (method === 'tools/call') {
    if (!ONEC_URL) {
      return {
        jsonrpc: '2.0', id,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'ONEC_URL not configured. Set environment variable ONEC_URL to point to your 1C:Enterprise MCP HTTP service endpoint (e.g., http://server/base/hs/mcp).'
            })
          }],
          isError: true
        }
      };
    }
    // Proxy to 1C
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (ONEC_USER) {
        headers['Authorization'] = 'Basic ' + Buffer.from(`${ONEC_USER}:${ONEC_PASSWORD}`).toString('base64');
      }
      const resp = await fetch(ONEC_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params })
      });
      const data = await resp.json();
      if (data.result) return { jsonrpc: '2.0', id, result: data.result };
      if (data.error) return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(data.error) }], isError: true } };
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(data) }] } };
    } catch (err) {
      return {
        jsonrpc: '2.0', id,
        result: { content: [{ type: 'text', text: `Error connecting to 1C: ${err.message}` }], isError: true }
      };
    }
  }

  if (method === 'ping') {
    return { jsonrpc: '2.0', id, result: {} };
  }

  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
}

// ─── stdio transport ────────────────────────────────────────────────────

const rl = createInterface({ input: process.stdin, terminal: false });

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const msg = JSON.parse(trimmed);
    const response = await handleRequest(msg);
    if (response) {
      process.stdout.write(JSON.stringify(response) + '\n');
    }
  } catch (err) {
    const errResp = { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } };
    process.stdout.write(JSON.stringify(errResp) + '\n');
  }
});

process.stderr.write('INFATON MCP35 server started (stdio mode)\n');
