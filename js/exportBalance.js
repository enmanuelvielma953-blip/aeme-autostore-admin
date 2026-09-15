function exportBalanceExcel() {

    try {

        /*
            ============================================================
            VALIDACIONES
            ============================================================
        */

        if (typeof XLSX === 'undefined') {
            alert(
                'No se pudo cargar la librería de Excel.\n\n' +
                'Verificá que tengas internet y que SheetJS esté cargado.'
            );

            return;
        }

        if (typeof state === 'undefined') {
            alert('No se encontró el estado de datos de AEME Pro.');
            return;
        }

        const orders = Array.isArray(state.orders)
            ? state.orders
            : [];

        const cash = Array.isArray(state.cash)
            ? state.cash
            : [];

        if (!orders.length && !cash.length) {
            alert('No hay datos para exportar.');
            return;
        }


        /*
            ============================================================
            FUNCIONES AUXILIARES
            ============================================================
        */

        const number = value => {

            const n = Number(value);

            return Number.isFinite(n)
                ? n
                : 0;
        };


        const date = value => {

            if (!value) {
                return null;
            }

            const d = new Date(value);

            return Number.isNaN(d.getTime())
                ? null
                : d;
        };


        const dateText = value => {

            const d = date(value);

            if (!d) {
                return '';
            }

            return d.toLocaleDateString('es-UY');
        };


        const dateTimeText = value => {

            const d = date(value);

            if (!d) {
                return '';
            }

            return d.toLocaleString('es-UY');
        };


        const moneyNumber = value => {

            return Math.round(
                number(value)
            );
        };


        const getOrder = orderId => {

            if (!orderId) {
                return null;
            }

            return orders.find(
                order => order.id === orderId
            ) || null;
        };


        /*
            ============================================================
            GASTOS POR ORDEN
            ============================================================
        */

        const getOrderExpenses = orderId => {

            return cash.filter(
                entry =>
                    entry.type === 'egreso' &&
                    entry.order_id === orderId
            );
        };


        const getOrderExpenseTotal = orderId => {

            return getOrderExpenses(orderId)
                .reduce(
                    (sum, entry) =>
                        sum + number(entry.amount),
                    0
                );
        };


        /*
            ============================================================
            INGRESOS / GASTOS
            ============================================================
        */

        const incomeEntries = cash.filter(
            entry =>
                entry.type === 'ingreso'
        );


        const expenseEntries = cash.filter(
            entry =>
                entry.type === 'egreso'
        );


        const totalIncome = incomeEntries.reduce(
            (sum, entry) =>
                sum + number(entry.amount),
            0
        );


        const totalExpenses = expenseEntries.reduce(
            (sum, entry) =>
                sum + number(entry.amount),
            0
        );


        const orderExpenses = expenseEntries.filter(
            entry =>
                !!entry.order_id
        );


        const generalExpenses = expenseEntries.filter(
            entry =>
                !entry.order_id
        );


        const totalOrderExpenses = orderExpenses.reduce(
            (sum, entry) =>
                sum + number(entry.amount),
            0
        );


        const totalGeneralExpenses = generalExpenses.reduce(
            (sum, entry) =>
                sum + number(entry.amount),
            0
        );


        /*
            ============================================================
            DATOS DE ÓRDENES
            ============================================================
        */

        const totalInvoiced = orders.reduce(
            (sum, order) =>
                sum + number(order.total),
            0
        );


        const totalPaidFromOrders = orders.reduce(
            (sum, order) =>
                sum + number(order.paid),
            0
        );


        const totalPending = orders.reduce(
            (sum, order) =>
                sum +
                Math.max(
                    0,
                    number(order.total) -
                    number(order.paid)
                ),
            0
        );


        /*
            Resultado de cada orden:

            Total de la orden
            -
            gastos asociados
        */

        const totalOrderResult = orders.reduce(
            (sum, order) => {

                const total =
                    number(order.total);

                const expenses =
                    getOrderExpenseTotal(order.id);

                return (
                    sum +
                    total -
                    expenses
                );
            },
            0
        );


        /*
            ============================================================
            GANANCIA NETA REAL
            ============================================================

            Ingresos de caja
            -
            todos los egresos
        */

        const netProfit =
            totalIncome -
            totalExpenses;


        /*
            ============================================================
            HOJA 1 — RESUMEN
            ============================================================
        */

        const summaryRows = [

            [
                'AEME PRO - RESUMEN FINANCIERO'
            ],

            [],

            [
                'Fecha de exportación',
                dateTimeText(new Date())
            ],

            [],

            [
                'ORDENES'
            ],

            [
                'Cantidad de órdenes',
                orders.length
            ],

            [
                'Facturación total',
                moneyNumber(totalInvoiced)
            ],

            [
                'Total cobrado en órdenes',
                moneyNumber(totalPaidFromOrders)
            ],

            [
                'Total pendiente de cobro',
                moneyNumber(totalPending)
            ],

            [],

            [
                'GASTOS'
            ],

            [
                'Gastos asociados a órdenes',
                moneyNumber(totalOrderExpenses)
            ],

            [
                'Gastos generales',
                moneyNumber(totalGeneralExpenses)
            ],

            [
                'Gastos totales',
                moneyNumber(totalExpenses)
            ],

            [],

            [
                'RESULTADOS'
            ],

            [
                'Resultado de las órdenes',
                moneyNumber(totalOrderResult)
            ],

            [
                'Ingresos de caja',
                moneyNumber(totalIncome)
            ],

            [
                'Egresos de caja',
                moneyNumber(totalExpenses)
            ],

            [
                'GANANCIA NETA',
                moneyNumber(netProfit)
            ],

            [],

            [
                'Nota'
            ],

            [
                'La ganancia neta se calcula como ingresos de caja menos todos los egresos.'
            ],

            [
                'El resultado de una orden se calcula como total de la orden menos sus gastos asociados.'
            ]
        ];


        /*
            ============================================================
            HOJA 2 — BALANCE POR ORDEN
            ============================================================
        */

        const orderRows = [

            [
                'ID Orden',
                'Fecha',
                'Cliente',
                'Teléfono',
                'Marca',
                'Modelo',
                'Matrícula',
                'Estado',
                'Entrega prometida',
                'Total orden',
                'Cobrado',
                'Pendiente',
                'Gastos asociados',
                'Resultado orden',
                'Margen %',
                'Cantidad gastos',
                'Categorías de gastos'
            ]

        ];


        orders
            .slice()
            .sort(
                (a, b) =>
                    new Date(a.created_at) -
                    new Date(b.created_at)
            )
            .forEach(order => {

                const total =
                    number(order.total);


                const paid =
                    number(order.paid);


                const pending =
                    Math.max(
                        0,
                        total - paid
                    );


                const expenses =
                    getOrderExpenseTotal(order.id);


                const result =
                    total - expenses;


                const margin =
                    total > 0
                        ? (result / total) * 100
                        : 0;


                const expensesList =
                    getOrderExpenses(order.id);


                const categories = [

                    ...new Set(

                        expensesList
                            .map(
                                x => x.category
                            )
                            .filter(Boolean)

                    )

                ].join(', ');


                orderRows.push([

                    order.id || '',

                    dateText(
                        order.created_at
                    ),

                    order.client_name || '',

                    order.phone || '',

                    order.brand || '',

                    order.model || '',

                    order.plate || '',

                    typeof statusLabel === 'function'
                        ? statusLabel(order.status)
                        : order.status || '',

                    order.due_date || '',

                    moneyNumber(total),

                    moneyNumber(paid),

                    moneyNumber(pending),

                    moneyNumber(expenses),

                    moneyNumber(result),

                    Number(
                        margin.toFixed(2)
                    ),

                    expensesList.length,

                    categories

                ]);

            });


        /*
            ============================================================
            TOTAL DE ÓRDENES
            ============================================================
        */

        orderRows.push([]);


        orderRows.push([

            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            'TOTAL',

            moneyNumber(
                totalInvoiced
            ),

            moneyNumber(
                totalPaidFromOrders
            ),

            moneyNumber(
                totalPending
            ),

            moneyNumber(
                totalOrderExpenses
            ),

            moneyNumber(
                totalOrderResult
            ),

            totalInvoiced > 0

                ? Number(
                    (
                        totalOrderResult /
                        totalInvoiced *
                        100
                    ).toFixed(2)
                )

                : 0,

            '',

            ''

        ]);


        /*
            ============================================================
            HOJA 3 — MOVIMIENTOS DE CAJA
            ============================================================
        */

        const cashRows = [

            [
                'Fecha',
                'Tipo',
                'Método',
                'Categoría',
                'Monto',
                'Descripción',
                'Orden',
                'Cliente',
                'Vehículo',
                'Matrícula'
            ]

        ];


        cash
            .slice()
            .sort(
                (a, b) =>
                    new Date(a.created_at) -
                    new Date(b.created_at)
            )
            .forEach(entry => {

                const order =
                    getOrder(
                        entry.order_id
                    );


                const vehicle =
                    order

                        ? `${order.brand || ''} ${order.model || ''}`.trim()

                        : '';


                cashRows.push([

                    dateTimeText(
                        entry.created_at
                    ),

                    entry.type === 'ingreso'
                        ? 'Ingreso'
                        : 'Egreso',

                    entry.method || '',

                    entry.category || '',

                    moneyNumber(

                        entry.type === 'egreso'

                            ? -number(
                                entry.amount
                            )

                            : number(
                                entry.amount
                            )

                    ),

                    entry.description || '',

                    order?.id || '',

                    order?.client_name || '',

                    vehicle,

                    order?.plate || ''

                ]);

            });


        /*
            ============================================================
            FUNCIONES PARA SEMANAS
            ============================================================
        */

        function getStartOfWeek(dateValue) {

            const d =
                new Date(dateValue);


            if (Number.isNaN(d.getTime())) {
                return null;
            }


            /*
                Lunes = primer día
                Domingo = último día
            */

            const day =
                d.getDay();


            const diff =
                day === 0
                    ? -6
                    : 1 - day;


            d.setDate(
                d.getDate() + diff
            );


            d.setHours(
                0,
                0,
                0,
                0
            );


            return d;
        }


        function formatISODate(d) {

            if (!d) {
                return '';
            }


            return [

                d.getFullYear(),

                String(
                    d.getMonth() + 1
                ).padStart(2, '0'),

                String(
                    d.getDate()
                ).padStart(2, '0')

            ].join('-');
        }


        /*
            ============================================================
            BALANCE SEMANAL
            ============================================================
        */

        const weeks =
            new Map();


        cash.forEach(entry => {

            const d =
                date(
                    entry.created_at
                );


            if (!d) {
                return;
            }


            const start =
                getStartOfWeek(d);


            const key =
                formatISODate(start);


            if (!weeks.has(key)) {

                const end =
                    new Date(start);


                end.setDate(
                    end.getDate() + 6
                );


                weeks.set(
                    key,
                    {

                        start,

                        end,

                        income: 0,

                        expenses: 0,

                        orderExpenses: 0,

                        generalExpenses: 0

                    }
                );
            }


            const week =
                weeks.get(key);


            const amount =
                number(entry.amount);


            if (
                entry.type === 'ingreso'
            ) {

                week.income += amount;

            } else {

                week.expenses += amount;


                if (entry.order_id) {

                    week.orderExpenses +=
                        amount;

                } else {

                    week.generalExpenses +=
                        amount;
                }
            }

        });


        const weeklyRows = [

            [
                'Semana',
                'Desde',
                'Hasta',
                'Ingresos',
                'Gastos órdenes',
                'Gastos generales',
                'Gastos totales',
                'Ganancia neta'
            ]

        ];


        [...weeks.values()]
            .sort(
                (a, b) =>
                    a.start - b.start
            )
            .forEach(week => {

                weeklyRows.push([

                    `Semana ${getWeekNumber(
                        week.start
                    )}`,

                    dateText(
                        week.start
                    ),

                    dateText(
                        week.end
                    ),

                    moneyNumber(
                        week.income
                    ),

                    moneyNumber(
                        week.orderExpenses
                    ),

                    moneyNumber(
                        week.generalExpenses
                    ),

                    moneyNumber(
                        week.expenses
                    ),

                    moneyNumber(
                        week.income -
                        week.expenses
                    )

                ]);

            });


        /*
            ============================================================
            NÚMERO DE SEMANA
            ============================================================
        */

        function getWeekNumber(dateValue) {

            const d =
                new Date(

                    Date.UTC(

                        dateValue.getFullYear(),

                        dateValue.getMonth(),

                        dateValue.getDate()

                    )

                );


            const dayNum =
                d.getUTCDay() || 7;


            d.setUTCDate(
                d.getUTCDate() +
                4 -
                dayNum
            );


            const yearStart =
                new Date(

                    Date.UTC(

                        d.getUTCFullYear(),

                        0,

                        1

                    )

                );


            return Math.ceil(

                (

                    (

                        (

                            d -
                            yearStart

                        ) / 86400000

                    ) + 1

                ) / 7

            );
        }


        /*
            ============================================================
            BALANCE MENSUAL
            ============================================================
        */

        const months =
            new Map();


        cash.forEach(entry => {

            const d =
                date(
                    entry.created_at
                );


            if (!d) {
                return;
            }


            const key =
                `${d.getFullYear()}-${String(
                    d.getMonth() + 1
                ).padStart(2, '0')}`;


            if (!months.has(key)) {

                months.set(

                    key,

                    {

                        year:
                            d.getFullYear(),

                        month:
                            d.getMonth(),

                        income: 0,

                        expenses: 0,

                        orderExpenses: 0,

                        generalExpenses: 0

                    }

                );
            }


            const month =
                months.get(key);


            const amount =
                number(
                    entry.amount
                );


            if (
                entry.type === 'ingreso'
            ) {

                month.income += amount;

            } else {

                month.expenses += amount;


                if (entry.order_id) {

                    month.orderExpenses +=
                        amount;

                } else {

                    month.generalExpenses +=
                        amount;
                }
            }

        });


        const monthlyRows = [

            [
                'Mes',
                'Ingresos',
                'Gastos órdenes',
                'Gastos generales',
                'Gastos totales',
                'Ganancia neta'
            ]

        ];


        [...months.values()]
            .sort(
                (a, b) => {

                    if (
                        a.year !==
                        b.year
                    ) {

                        return (
                            a.year -
                            b.year
                        );
                    }


                    return (
                        a.month -
                        b.month
                    );

                }
            )
            .forEach(month => {

                const monthDate =
                    new Date(

                        month.year,

                        month.month,

                        1

                    );


                monthlyRows.push([

                    monthDate.toLocaleDateString(

                        'es-UY',

                        {

                            month: 'long',

                            year: 'numeric'

                        }

                    ),

                    moneyNumber(
                        month.income
                    ),

                    moneyNumber(
                        month.orderExpenses
                    ),

                    moneyNumber(
                        month.generalExpenses
                    ),

                    moneyNumber(
                        month.expenses
                    ),

                    moneyNumber(

                        month.income -
                        month.expenses

                    )

                ]);

            });


        /*
            ============================================================
            CREAR EXCEL
            ============================================================
        */

        const workbook =
            XLSX.utils.book_new();


        /*
            ============================================================
            CREAR HOJAS
            ============================================================
        */

        const summarySheet =
            XLSX.utils.aoa_to_sheet(
                summaryRows
            );


        const ordersSheet =
            XLSX.utils.aoa_to_sheet(
                orderRows
            );


        const cashSheet =
            XLSX.utils.aoa_to_sheet(
                cashRows
            );


        const weeklySheet =
            XLSX.utils.aoa_to_sheet(
                weeklyRows
            );


        const monthlySheet =
            XLSX.utils.aoa_to_sheet(
                monthlyRows
            );


        /*
            ============================================================
            AGREGAR HOJAS AL LIBRO
            ============================================================
        */

        XLSX.utils.book_append_sheet(
            workbook,
            summarySheet,
            'Resumen'
        );


        XLSX.utils.book_append_sheet(
            workbook,
            ordersSheet,
            'Balance órdenes'
        );


        XLSX.utils.book_append_sheet(
            workbook,
            cashSheet,
            'Movimientos caja'
        );


        XLSX.utils.book_append_sheet(
            workbook,
            weeklySheet,
            'Balance semanal'
        );


        XLSX.utils.book_append_sheet(
            workbook,
            monthlySheet,
            'Balance mensual'
        );


        /*
            ============================================================
            ANCHOS DE COLUMNA
            ============================================================
        */

        summarySheet['!cols'] = [

            { wch: 35 },
            { wch: 25 }

        ];


        ordersSheet['!cols'] = [

            { wch: 38 },
            { wch: 13 },
            { wch: 25 },
            { wch: 18 },
            { wch: 14 },
            { wch: 18 },
            { wch: 14 },
            { wch: 18 },
            { wch: 18 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 18 },
            { wch: 18 },
            { wch: 12 },
            { wch: 15 },
            { wch: 35 }

        ];


        cashSheet['!cols'] = [

            { wch: 22 },
            { wch: 12 },
            { wch: 18 },
            { wch: 22 },
            { wch: 15 },
            { wch: 40 },
            { wch: 38 },
            { wch: 25 },
            { wch: 25 },
            { wch: 15 }

        ];


        weeklySheet['!cols'] = [

            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 18 },
            { wch: 20 },
            { wch: 18 },
            { wch: 18 }

        ];


        monthlySheet['!cols'] = [

            { wch: 25 },
            { wch: 18 },
            { wch: 18 },
            { wch: 20 },
            { wch: 18 },
            { wch: 18 }

        ];


        /*
            ============================================================
            FORMATO DE MONEDA
            ============================================================
        */

        function formatCurrencyColumn(
            sheet,
            column,
            startRow,
            endRow
        ) {

            for (
                let row = startRow;
                row <= endRow;
                row++
            ) {

                const cellRef =
                    XLSX.utils.encode_cell({

                        r: row,

                        c: column

                    });


                const cell =
                    sheet[cellRef];


                if (cell) {

                    cell.z =
                        '"$" #,##0';

                }

            }

        }


        /*
            ============================================================
            APLICAR FORMATOS DE MONEDA
            ============================================================
        */

        /*
            Balance Órdenes

            0 = ID
            1 = Fecha
            2 = Cliente
            3 = Teléfono
            4 = Marca
            5 = Modelo
            6 = Matrícula
            7 = Estado
            8 = Entrega prometida

            9  = Total orden
            10 = Cobrado
            11 = Pendiente
            12 = Gastos asociados
            13 = Resultado orden
        */

        [
            9,
            10,
            11,
            12,
            13

        ].forEach(col => {

            formatCurrencyColumn(

                ordersSheet,

                col,

                1,

                orderRows.length - 1

            );

        });


        /*
            Movimientos de caja

            4 = Monto
        */

        formatCurrencyColumn(

            cashSheet,

            4,

            1,

            cashRows.length - 1

        );


        /*
            Balance semanal

            3 = Ingresos
            4 = Gastos órdenes
            5 = Gastos generales
            6 = Gastos totales
            7 = Ganancia neta
        */

        for (
            let col = 3;
            col <= 7;
            col++
        ) {

            formatCurrencyColumn(

                weeklySheet,

                col,

                1,

                weeklyRows.length - 1

            );

        }


        /*
            Balance mensual

            1 = Ingresos
            2 = Gastos órdenes
            3 = Gastos generales
            4 = Gastos totales
            5 = Ganancia neta
        */

        for (
            let col = 1;
            col <= 5;
            col++
        ) {

            formatCurrencyColumn(

                monthlySheet,

                col,

                1,

                monthlyRows.length - 1

            );

        }


        /*
            ============================================================
            FORMATO DE PORCENTAJES
            ============================================================
        */

        function formatPercentColumn(
            sheet,
            column,
            startRow,
            endRow
        ) {

            for (
                let row = startRow;
                row <= endRow;
                row++
            ) {

                const cellRef =
                    XLSX.utils.encode_cell({

                        r: row,

                        c: column

                    });


                const cell =
                    sheet[cellRef];


                if (cell) {

                    cell.z =
                        '0.00"%"';

                }

            }

        }


        /*
            Margen %

            Columna 14
        */

        formatPercentColumn(

            ordersSheet,

            14,

            1,

            orderRows.length - 1

        );


        /*
            ============================================================
            CONGELAR ENCABEZADOS
            ============================================================
        */

        const freezeHeader = {

            xSplit: 0,

            ySplit: 1

        };


        ordersSheet['!freeze'] =
            freezeHeader;


        cashSheet['!freeze'] =
            freezeHeader;


        weeklySheet['!freeze'] =
            freezeHeader;


        monthlySheet['!freeze'] =
            freezeHeader;


        /*
            ============================================================
            AUTOFILTRO
            ============================================================
        */

        if (orderRows.length > 1) {

            ordersSheet['!autofilter'] = {

                ref:
                    XLSX.utils.encode_range({

                        s: {
                            r: 0,
                            c: 0
                        },

                        e: {
                            r: orderRows.length - 1,
                            c: 16
                        }

                    })

            };

        }


        if (cashRows.length > 1) {

            cashSheet['!autofilter'] = {

                ref:
                    XLSX.utils.encode_range({

                        s: {
                            r: 0,
                            c: 0
                        },

                        e: {
                            r: cashRows.length - 1,
                            c: 9
                        }

                    })

            };

        }


        if (weeklyRows.length > 1) {

            weeklySheet['!autofilter'] = {

                ref:
                    XLSX.utils.encode_range({

                        s: {
                            r: 0,
                            c: 0
                        },

                        e: {
                            r: weeklyRows.length - 1,
                            c: 7
                        }

                    })

            };

        }


        if (monthlyRows.length > 1) {

            monthlySheet['!autofilter'] = {

                ref:
                    XLSX.utils.encode_range({

                        s: {
                            r: 0,
                            c: 0
                        },

                        e: {
                            r: monthlyRows.length - 1,
                            c: 5
                        }

                    })

            };

        }


        /*
            ============================================================
            NOMBRE DEL ARCHIVO
            ============================================================
        */

        const now =
            new Date();


        const year =
            now.getFullYear();


        const month =
            String(
                now.getMonth() + 1
            ).padStart(2, '0');


        const day =
            String(
                now.getDate()
            ).padStart(2, '0');


        const today =
            `${year}-${month}-${day}`;


        const fileName =
            `aeme-pro-balance-${today}.xlsx`;


        /*
            ============================================================
            DESCARGAR EXCEL
            ============================================================
        */

        XLSX.writeFile(
            workbook,
            fileName
        );


        alert(
            `Excel generado correctamente.\n\nArchivo: ${fileName}`
        );


    } catch (error) {

        console.error(
            'Error al preparar la exportación de Excel:',
            error
        );


        alert(
            'No se pudo preparar la exportación de Excel.\n\n' +
            'Revisá la consola del navegador para más detalles.'
        );

    }

}