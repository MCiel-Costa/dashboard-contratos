window.onerror = function(msg, url, lineNo, columnNo, error) {
    const errDiv = document.createElement('div');
    errDiv.style = "position:fixed; top:0; left:0; width:100%; background:red; color:white; padding:20px; z-index:9999;";
    errDiv.innerHTML = `<h3>Erro Javascript Detectado</h3><p>${msg}</p><p>Linha: ${lineNo}</p><pre>${error ? error.stack : ''}</pre>`;
    document.body.appendChild(errDiv);
    return false;
};

document.addEventListener('DOMContentLoaded', () => {
    try {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        const loadingSpinner = document.getElementById('loading-spinner');
        const tbody = document.getElementById('contracts-tbody');
        const kpiTotal = document.getElementById('kpi-total-contratos');
        const kpiValor = document.getElementById('kpi-valor-total');
        const kpiVencer = document.getElementById('kpi-vencer-30');
        const searchInput = document.getElementById('search-input');
        const themeToggle = document.getElementById('theme-toggle');
        const navItems = document.querySelectorAll('.nav-item');
        const btnResetFilter = document.getElementById('btn-reset-filter');

        const sectionKpis = document.getElementById('section-kpis');
        const sectionCharts = document.getElementById('section-charts');
        const sectionTable = document.getElementById('section-table');

        const yearFilter = document.getElementById('year-filter');
        const statusFilter = document.getElementById('status-filter');

        let allContracts = [];
        let statusChartInstance = null;
        let vencimentoChartInstance = null;

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                
                const view = item.getAttribute('data-view');
                if (view === 'visao-geral') {
                    if(sectionKpis) sectionKpis.style.display = 'grid';
                    if(sectionCharts) sectionCharts.style.display = 'grid';
                    if(sectionTable) sectionTable.style.display = 'block';
                } else if (view === 'contratos') {
                    if(sectionKpis) sectionKpis.style.display = 'none';
                    if(sectionCharts) sectionCharts.style.display = 'none';
                    if(sectionTable) sectionTable.style.display = 'block';
                }
            });
        });

        const currentTheme = localStorage.getItem('theme') ? localStorage.getItem('theme') : null;
        if (currentTheme) {
            document.documentElement.setAttribute('data-theme', currentTheme);
        }

        if(themeToggle) {
            themeToggle.addEventListener('click', () => {
                let theme = document.documentElement.getAttribute('data-theme');
                if (theme === 'dark') {
                    document.documentElement.setAttribute('data-theme', 'light');
                    localStorage.setItem('theme', 'light');
                } else {
                    document.documentElement.setAttribute('data-theme', 'dark');
                    localStorage.setItem('theme', 'dark');
                }
                updateChartsTheme();
            });
        }

        function loadStaticData() {
            if (typeof staticData !== 'undefined' && staticData.length > 0) {
                allContracts = staticData;
                populateYearDropdown(allContracts);
                applyFilters();
                if(loadingSpinner) loadingSpinner.style.display = 'none';
            } else {
                throw new Error('A variável staticData não foi encontrada ou está vazia. Verifique se data.js está carregando corretamente.');
            }
        }

        function parseCurrencyBR(valStr) {
            if (!valStr) return 0;
            return parseFloat(valStr.toString().replace(/\./g, '').replace(',', '.'));
        }

        function formatBRL(value) {
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
        }

        function populateYearDropdown(data) {
            if(!yearFilter) return;
            const years = new Set();
            data.forEach(c => {
                if (c.vigencia_fim) {
                    const dateParts = c.vigencia_fim.split('-');
                    if (dateParts.length === 3) {
                        years.add(dateParts[0]);
                    }
                }
            });
            
            const sortedYears = Array.from(years).sort((a, b) => b - a);
            sortedYears.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearFilter.appendChild(option);
            });
        }

        function applyFilters() {
            const selectedYear = yearFilter ? yearFilter.value : 'all';
            const selectedStatus = statusFilter ? statusFilter.value : 'all';
            const term = searchInput ? searchInput.value.toLowerCase() : '';
            
            const now = new Date();
            
            if(btnResetFilter) {
                if (selectedYear !== 'all' || selectedStatus !== 'all' || term.length > 0) {
                    btnResetFilter.style.display = 'block';
                } else {
                    btnResetFilter.style.display = 'none';
                }
            }

            const filtered = allContracts.filter(c => {
                let yearMatch = true;
                if (selectedYear !== 'all') {
                    if (!c.vigencia_fim || !c.vigencia_fim.startsWith(selectedYear)) {
                        yearMatch = false;
                    }
                }
                
                let statusMatch = true;
                let isVencido = false;
                if (c.vigencia_fim) {
                    const endDate = new Date(c.vigencia_fim);
                    if (endDate < now) isVencido = true;
                }
                
                if (selectedStatus === 'Ativo' && isVencido) statusMatch = false;
                if (selectedStatus === 'Vencido' && !isVencido) statusMatch = false;
                
                let searchMatch = true;
                if (term.length > 0) {
                    const fornecedor = c.fornecedor && c.fornecedor.nome ? c.fornecedor.nome.toLowerCase() : '';
                    const obj = c.objeto ? c.objeto.toLowerCase() : '';
                    searchMatch = fornecedor.includes(term) || obj.includes(term);
                }
                
                return yearMatch && statusMatch && searchMatch;
            });
            
            processDashboardData(filtered);
        }

        if(yearFilter) yearFilter.addEventListener('change', applyFilters);
        if(statusFilter) statusFilter.addEventListener('change', applyFilters);
        if(searchInput) searchInput.addEventListener('input', applyFilters);

        if(btnResetFilter) {
            btnResetFilter.addEventListener('click', () => {
                if(yearFilter) yearFilter.value = 'all';
                if(statusFilter) statusFilter.value = 'all';
                if(searchInput) searchInput.value = '';
                applyFilters();
            });
        }

        function processDashboardData(data) {
            let totalValor = 0;
            let vencer30Dias = 0;
            let countAtivos = 0;
            let countVencidos = 0;
            
            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(now.getDate() + 30);

            const vencimentoMap = {};

            data.forEach(contrato => {
                const val = parseCurrencyBR(contrato.valor_global);
                totalValor += val;

                let isVencido = false;

                if (contrato.vigencia_fim) {
                    const endDate = new Date(contrato.vigencia_fim);
                    
                    if (endDate < now) {
                        isVencido = true;
                        countVencidos++;
                    } else {
                        countAtivos++;
                        if (endDate <= thirtyDaysFromNow) {
                            vencer30Dias++;
                        }
                    }

                    const monthYear = String(endDate.getMonth() + 1).padStart(2, '0') + '/' + endDate.getFullYear();
                    vencimentoMap[monthYear] = (vencimentoMap[monthYear] || 0) + 1;
                } else {
                    countAtivos++;
                }
            });

            if(kpiTotal) kpiTotal.innerText = data.length;
            if(kpiValor) kpiValor.innerText = formatBRL(totalValor);
            if(kpiVencer) kpiVencer.innerText = vencer30Dias;

            renderTable(data, now, thirtyDaysFromNow);

            const statusData = [countAtivos, countVencidos];
            
            const sortedVencimentos = Object.entries(vencimentoMap)
                .sort((a, b) => {
                    const [m1, y1] = a[0].split('/');
                    const [m2, y2] = b[0].split('/');
                    return new Date(y1, m1 - 1) - new Date(y2, m2 - 1);
                });

            renderCharts(statusData, sortedVencimentos);
        }

        function renderTable(data, now, thirtyDaysFromNow) {
            if(!tbody) return;
            tbody.innerHTML = '';
            
            data.forEach(c => {
                const tr = document.createElement('tr');
                
                const fornecedor = c.fornecedor ? c.fornecedor.nome : 'N/A';
                const valor = c.valor_global ? formatBRL(parseCurrencyBR(c.valor_global)) : 'R$ 0,00';
                let dataVenc = 'N/A';
                let statusClass = 'status-ativo';
                let statusText = c.situacao || 'Ativo';

                if (c.vigencia_fim) {
                    const dateParts = c.vigencia_fim.split('-');
                    if (dateParts.length === 3) {
                        dataVenc = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];
                        
                        const endDate = new Date(c.vigencia_fim);
                        if (endDate < now) {
                            statusText = 'Vencido';
                            statusClass = '';
                            tr.style.opacity = '0.6';
                        } else if (endDate <= thirtyDaysFromNow) {
                            statusText = 'A Vencer';
                            statusClass = 'status-vencendo';
                        }
                    }
                }

                tr.innerHTML = `
                    <td><strong>${c.numero || '-'}</strong></td>
                    <td>${fornecedor}</td>
                    <td class="obj-cell" title="${c.objeto}">${c.objeto || '-'}</td>
                    <td>${valor}</td>
                    <td>${dataVenc}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                `;
                tbody.appendChild(tr);
            });
        }

        function filterTableByMonth(monthYear) {
            const [mStr, yStr] = monthYear.split('/');
            
            const filtered = allContracts.filter(c => {
                if (!c.vigencia_fim) return false;
                const [y, m, d] = c.vigencia_fim.split('-');
                return (m === mStr && y === yStr);
            });
            
            renderTable(filtered, new Date(), new Date());
            if(btnResetFilter) btnResetFilter.style.display = 'block';
            
            navItems.forEach(n => n.classList.remove('active'));
            const contBtn = document.querySelector('[data-view="contratos"]');
            if(contBtn) contBtn.classList.add('active');
            
            if(sectionKpis) sectionKpis.style.display = 'none';
            if(sectionCharts) sectionCharts.style.display = 'none';
            if(sectionTable) {
                sectionTable.style.display = 'block';
                sectionTable.scrollIntoView({ behavior: 'smooth' });
            }
        }

        function getChartColors() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            return {
                textColor: isDark ? '#f8fafc' : '#0f172a',
                gridColor: isDark ? '#334155' : '#e2e8f0',
                primaryColor: '#6366f1',
                primaryHover: '#818cf8',
                secondaryColor: '#10b981',
                secondaryHover: '#34d399',
                dangerColor: '#ef4444',
                dangerHover: '#f87171'
            };
        }

        function renderCharts(statusData, vencimentosData) {
            if (typeof Chart === 'undefined') {
                console.warn("Chart.js não carregou, ignorando gráficos.");
                return;
            }

            const canvasStatus = document.getElementById('statusChart');
            const canvasVencimento = document.getElementById('vencimentoChart');
            
            if(!canvasStatus || !canvasVencimento) return;

            const ctxStatus = canvasStatus.getContext('2d');
            const ctxVencimento = canvasVencimento.getContext('2d');
            const colors = getChartColors();

            Chart.defaults.color = colors.textColor;
            Chart.defaults.font.family = "'Inter', sans-serif";

            if (statusChartInstance) statusChartInstance.destroy();
            if (vencimentoChartInstance) vencimentoChartInstance.destroy();

            statusChartInstance = new Chart(ctxStatus, {
                type: 'doughnut',
                data: {
                    labels: ['Ativos', 'Vencidos'],
                    datasets: [{
                        data: statusData,
                        backgroundColor: [colors.secondaryColor, colors.dangerColor],
                        hoverBackgroundColor: [colors.secondaryHover, colors.dangerHover],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: { 
                            position: 'bottom',
                            labels: { color: colors.textColor }
                        }
                    }
                }
            });

            vencimentoChartInstance = new Chart(ctxVencimento, {
                type: 'line',
                data: {
                    labels: vencimentosData.map(d => d[0]),
                    datasets: [{
                        label: 'Contratos Vencendo',
                        data: vencimentosData.map(d => d[1]),
                        borderColor: colors.primaryColor,
                        backgroundColor: 'rgba(99, 102, 241, 0.2)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: colors.primaryColor,
                        pointRadius: 5,
                        hitRadius: 10,
                        hoverRadius: 7,
                        cursor: 'pointer'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    onClick: (e, elements) => {
                        if (elements && elements.length > 0) {
                            const index = elements[0].index;
                            const monthYear = vencimentoChartInstance.data.labels[index];
                            filterTableByMonth(monthYear);
                        }
                    },
                    onHover: (event, chartElement) => {
                        if(event.native && event.native.target) {
                            event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => context.raw + ' Contrato(s)'
                            }
                        }
                    },
                    scales: {
                        y: {
                            grid: { color: colors.gridColor },
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        function updateChartsTheme() {
            if (allContracts.length > 0) {
                applyFilters();
            }
        }

        loadStaticData();

    } catch (e) {
        const errDiv = document.createElement('div');
        errDiv.style = "position:fixed; top:0; left:0; width:100%; background:#ef4444; color:white; padding:20px; z-index:9999;";
        errDiv.innerHTML = `<h3>Erro ao inicializar o Dashboard</h3><p>${e.message}</p><pre>${e.stack}</pre>`;
        document.body.appendChild(errDiv);
    }
});
