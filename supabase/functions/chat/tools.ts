/**
 * Gemini function declarations for Asti attendance tools.
 * These are sent to the Gemini API as the `tools` parameter.
 */
export const tools = [
  {
    functionDeclarations: [
      // ── Query tools (all authenticated users) ────────────────
      {
        name: 'get_modules',
        description: 'List all available modules/subjects in the system.',
        parameters: { type: 'OBJECT', properties: {} },
      },
      {
        name: 'get_student_list',
        description: 'List all students enrolled in a module. If no module is specified, uses the current active module.',
        parameters: {
          type: 'OBJECT',
          properties: {
            module_name: {
              type: 'STRING',
              description: 'Name (or partial name) of the module. Optional — defaults to current module.',
            },
          },
        },
      },
      {
        name: 'get_attendance_today',
        description: "Get today's attendance records, showing who is present and who is absent.",
        parameters: {
          type: 'OBJECT',
          properties: {
            module_name: {
              type: 'STRING',
              description: 'Name (or partial name) of the module. Optional — defaults to current module.',
            },
          },
        },
      },
      {
        name: 'get_attendance_by_date',
        description: 'Get attendance records for a specific date.',
        parameters: {
          type: 'OBJECT',
          properties: {
            date: {
              type: 'STRING',
              description: 'Date in YYYY-MM-DD format.',
            },
            module_name: {
              type: 'STRING',
              description: 'Name (or partial name) of the module. Optional — defaults to current module.',
            },
          },
          required: ['date'],
        },
      },
      {
        name: 'get_absent_students',
        description: 'Get a list of students who were absent on a given date (or today).',
        parameters: {
          type: 'OBJECT',
          properties: {
            date: {
              type: 'STRING',
              description: 'Date in YYYY-MM-DD format. Optional — defaults to today.',
            },
            module_name: {
              type: 'STRING',
              description: 'Name (or partial name) of the module. Optional — defaults to current module.',
            },
          },
        },
      },
      {
        name: 'get_attendance_summary',
        description: 'Get attendance statistics for a student or module over a date range.',
        parameters: {
          type: 'OBJECT',
          properties: {
            student_name: {
              type: 'STRING',
              description: 'Name (or partial name) of the student. Optional.',
            },
            module_name: {
              type: 'STRING',
              description: 'Name (or partial name) of the module. Optional — defaults to current module.',
            },
            from_date: {
              type: 'STRING',
              description: 'Start date in YYYY-MM-DD format. Optional.',
            },
            to_date: {
              type: 'STRING',
              description: 'End date in YYYY-MM-DD format. Optional.',
            },
          },
        },
      },

      // ── Mutation tools (admin / instructor only) ──────────────
      {
        name: 'mark_attendance',
        description: "Mark a single student's attendance status for a given date.",
        parameters: {
          type: 'OBJECT',
          properties: {
            student_name: {
              type: 'STRING',
              description: 'Name (or partial name) of the student.',
            },
            status: {
              type: 'STRING',
              description: '"present" or "absent"',
              enum: ['present', 'absent'],
            },
            date: {
              type: 'STRING',
              description: 'Date in YYYY-MM-DD format. Optional — defaults to today.',
            },
            module_name: {
              type: 'STRING',
              description: 'Name (or partial name) of the module. Optional — defaults to current module.',
            },
          },
          required: ['student_name', 'status'],
        },
      },
      {
        name: 'mark_bulk_attendance',
        description: 'Mark multiple students attendance at once.',
        parameters: {
          type: 'OBJECT',
          properties: {
            entries: {
              type: 'ARRAY',
              description: 'List of student attendance entries.',
              items: {
                type: 'OBJECT',
                properties: {
                  student_name: { type: 'STRING', description: 'Student name or partial name.' },
                  status: { type: 'STRING', description: '"present" or "absent"', enum: ['present', 'absent'] },
                },
                required: ['student_name', 'status'],
              },
            },
            date: {
              type: 'STRING',
              description: 'Date in YYYY-MM-DD format. Optional — defaults to today.',
            },
            module_name: {
              type: 'STRING',
              description: 'Name (or partial name) of the module. Optional — defaults to current module.',
            },
          },
          required: ['entries'],
        },
      },
      {
        name: 'create_module',
        description: 'Create a new module/subject.',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING', description: 'Name of the new module.' },
          },
          required: ['name'],
        },
      },
      {
        name: 'set_active_module',
        description: 'Set the specified module as the currently active module.',
        parameters: {
          type: 'OBJECT',
          properties: {
            module_name: { type: 'STRING', description: 'Name (or partial name) of the module to activate.' },
          },
          required: ['module_name'],
        },
      },
      {
        name: 'enroll_student',
        description: 'Enroll a student in a module.',
        parameters: {
          type: 'OBJECT',
          properties: {
            student_name: { type: 'STRING', description: 'Name (or partial name) of the student.' },
            module_name: { type: 'STRING', description: 'Name (or partial name) of the module.' },
          },
          required: ['student_name', 'module_name'],
        },
      },
      {
        name: 'unenroll_student',
        description: 'Remove a student from a module.',
        parameters: {
          type: 'OBJECT',
          properties: {
            student_name: { type: 'STRING', description: 'Name (or partial name) of the student.' },
            module_name: { type: 'STRING', description: 'Name (or partial name) of the module.' },
          },
          required: ['student_name', 'module_name'],
        },
      },
    ],
  },
]
