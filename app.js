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
        const kpiVencer = document.getElementById('kpi-vencer-30-val');
        const searchInput = document.getElementById('search-input');
        const themeToggle = document.getElementById('theme-toggle');
        const navItems = document.querySelectorAll('.nav-item');
        const btnResetFilter = document.getElementById('btn-reset-filter');

        const sectionKpis = document.getElementById('section-kpis');
        const sectionCharts = document.getElementById('section-charts');
        const sectionTable = document.getElementById('section-table');
        const sectionValores = document.getElementById('section-valores');
        const cardValorTotal = document.getElementById('card-valor-total');
        const cardTotalContratos = document.getElementById('card-total-contratos');
        const cardVencer30 = document.getElementById('card-vencer-30');
        const btnBackVisao = document.getElementById('btn-back-visao');
        const btnBackVisaoTabela = document.getElementById('btn-back-visao-tabela');

        const yearFilter = document.getElementById('year-filter');
        const statusFilter = document.getElementById('status-filter');

        let allContracts = [];
        let currentFilteredData = [];
        let statusChartInstance = null;
        let vencimentoChartInstance = null;
        let valoresChartInstance = null;

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                const updateView = () => {
                    navItems.forEach(n => n.classList.remove('active'));
                    item.classList.add('active');
                    
                    const view = item.getAttribute('data-view');
                    if (view === 'visao-geral') {
                        let needsUpdate = false;
                        if(statusFilter && statusFilter.value !== 'all') {
                            statusFilter.value = 'all';
                            needsUpdate = true;
                        }
                        if(searchInput && searchInput.value !== '') {
                            searchInput.value = '';
                            needsUpdate = true;
                        }
                        if (needsUpdate) applyFilters();

                        if(sectionKpis) sectionKpis.style.display = 'grid';
                        if(sectionCharts) sectionCharts.style.display = 'grid';
                        if(sectionTable) sectionTable.style.display = 'none';
                        if(sectionValores) sectionValores.style.display = 'none';
                    } else if (view === 'contratos') {
                        if(sectionKpis) sectionKpis.style.display = 'none';
                        if(sectionCharts) sectionCharts.style.display = 'none';
                        if(sectionTable) sectionTable.style.display = 'block';
                        if(sectionValores) sectionValores.style.display = 'none';
                    } else if (view === 'valores') {
                        if(sectionKpis) sectionKpis.style.display = 'none';
                        if(sectionCharts) sectionCharts.style.display = 'none';
                        if(sectionTable) sectionTable.style.display = 'none';
                        if(sectionValores) {
                            sectionValores.style.display = 'block';
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                        renderValoresChart(currentFilteredData);
                    } else if (view === 'vencer-30') {
                        if(statusFilter && statusFilter.value !== 'A Vencer') {
                            statusFilter.value = 'A Vencer';
                            if(yearFilter) yearFilter.value = 'all';
                            if(searchInput) searchInput.value = '';
                            applyFilters();
                        }
                        if(sectionKpis) sectionKpis.style.display = 'none';
                        if(sectionCharts) sectionCharts.style.display = 'none';
                        if(sectionValores) sectionValores.style.display = 'none';
                        if(sectionTable) {
                            sectionTable.style.display = 'block';
                            sectionTable.scrollIntoView({ behavior: 'smooth' });
                        }
                    }
                };

                if (document.startViewTransition) {
                    document.startViewTransition(updateView);
                } else {
                    updateView();
                }
            });
        });

        const currentTheme = localStorage.getItem('theme') ? localStorage.getItem('theme') : null;
        if (currentTheme) {
            document.documentElement.setAttribute('data-theme', currentTheme);
        }

        if(themeToggle) {
            const updateThemeUI = (theme) => {
                const icon = themeToggle.querySelector('i');
                const span = themeToggle.querySelector('span');
                if (theme === 'dark') {
                    if(icon) icon.setAttribute('data-lucide', 'sun');
                    if(span) span.innerText = 'Modo Claro';
                } else {
                    if(icon) icon.setAttribute('data-lucide', 'moon');
                    if(span) span.innerText = 'Modo Escuro';
                }
                if (window.lucide) lucide.createIcons();
            };

            // Initialize UI
            updateThemeUI(document.documentElement.getAttribute('data-theme'));

            themeToggle.addEventListener('click', () => {
                let theme = document.documentElement.getAttribute('data-theme');
                let newTheme = theme === 'dark' ? 'light' : 'dark';
                
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                updateThemeUI(newTheme);
                updateChartsTheme();
            });
        }

        if(cardValorTotal) {
            cardValorTotal.addEventListener('click', () => {
                const performTransition = () => {
                    navItems.forEach(n => n.classList.remove('active'));
                    const navValores = document.querySelector('[data-view="valores"]');
                    if(navValores) navValores.classList.add('active');
                    if(sectionKpis) sectionKpis.style.display = 'none';
                    if(sectionCharts) sectionCharts.style.display = 'none';
                    if(sectionTable) sectionTable.style.display = 'none';
                    if(sectionValores) {
                        sectionValores.style.display = 'block';
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                    renderValoresChart(currentFilteredData);
                };

                if (document.startViewTransition) {
                    document.startViewTransition(performTransition);
                } else {
                    performTransition();
                    if(sectionValores) sectionValores.style.animation = 'scaleUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
                }
            });
        }

        if(cardTotalContratos) {
            cardTotalContratos.addEventListener('click', () => {
                if(sectionTable) sectionTable.style.viewTransitionName = 'expand-table';
                filterTableByStatus('all');
            });
        }

        if(cardVencer30) {
            cardVencer30.addEventListener('click', () => {
                if(sectionTable) sectionTable.style.viewTransitionName = 'expand-vencer';
                filterTableByStatus('A Vencer');
            });
        }

        if(btnBackVisao) {
            btnBackVisao.addEventListener('click', () => {
                const navVisao = document.querySelector('[data-view="visao-geral"]');
                if(navVisao) navVisao.click();
            });
        }

        if(btnBackVisaoTabela) {
            btnBackVisaoTabela.addEventListener('click', () => {
                const navVisao = document.querySelector('[data-view="visao-geral"]');
                if(navVisao) navVisao.click();
            });
        }

        function loadStaticData() {
            if (typeof staticData !== 'undefined' && staticData.length > 0) {
                allContracts = staticData;
                
                // Exibir data de atualização
                const lastUpdateSpan = document.getElementById('last-update-date');
                if (lastUpdateSpan && typeof lastUpdateDate !== 'undefined') {
                    lastUpdateSpan.innerText = lastUpdateDate;
                } else if (lastUpdateSpan) {
                    lastUpdateSpan.innerText = 'Não disponível';
                }

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
                let isVencendo = false;
                if (c.vigencia_fim) {
                    const endDate = new Date(c.vigencia_fim);
                    if (endDate < now) {
                        isVencido = true;
                    } else {
                        const thirtyDaysFromNow = new Date();
                        thirtyDaysFromNow.setDate(now.getDate() + 30);
                        if (endDate <= thirtyDaysFromNow) {
                            isVencendo = true;
                        }
                    }
                }
                
                if (selectedStatus === 'Ativo' && isVencido) statusMatch = false;
                if (selectedStatus === 'Vencido' && !isVencido) statusMatch = false;
                if (selectedStatus === 'A Vencer' && !isVencendo) statusMatch = false;
                
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
            currentFilteredData = data;
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
            
            data.forEach((c, index) => {
                const tr = document.createElement('tr');
                tr.classList.add('clickable-row');
                tr.setAttribute('data-id', c.id || index);
                
                const fornecedor = c.fornecedor ? c.fornecedor.nome : 'N/A';
                const valorGlobalNum = parseCurrencyBR(c.valor_global);
                const valorAcumuladoNum = parseCurrencyBR(c.valor_acumulado);
                const valor = formatBRL(valorGlobalNum);
                const valorParcela = c.valor_parcela ? formatBRL(parseCurrencyBR(c.valor_parcela)) : 'N/A';
                
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
                    <td>
                        <div class="status-cell">
                            <span class="status-badge ${statusClass}">${statusText}</span>
                            <i data-lucide="chevron-down" class="expand-icon" style="width: 16px; height: 16px;"></i>
                        </div>
                    </td>
                `;

                const detailTr = document.createElement('tr');
                detailTr.classList.add('details-row');
                detailTr.id = `details-${c.id || index}`;
                detailTr.innerHTML = `
                    <td colspan="6">
                        <div class="details-wrapper">
                            <div class="details-container">
                                <div class="details-grid">
                                    <div class="detail-item">
                                        <span class="detail-label">Valor Total</span>
                                        <span class="detail-value">${valor}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Nº de Parcelas</span>
                                        <span class="detail-value">${c.num_parcelas || 'N/A'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Valor da Parcela</span>
                                        <span class="detail-value">${valorParcela}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Modalidade</span>
                                        <span class="detail-value">${c.modalidade || 'N/A'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">CNPJ/CPF Fornecedor</span>
                                        <span class="detail-value">${c.fornecedor ? c.fornecedor.cnpj_cpf_idgener : 'N/A'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Processo</span>
                                        <span class="detail-value">${c.processo || 'N/A'}</span>
                                    </div>
                                </div>
                                <div style="padding-bottom: 1.5rem; display: flex; gap: 1rem;">
                                    <a href="https://contratos.comprasnet.gov.br/transparencia/contratos/${c.id}" target="_blank" class="search-input" style="text-decoration: none; display: flex; align-items: center; gap: 0.5rem; width: auto; font-size: 0.85rem; padding: 0.5rem 1rem;">
                                        <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
                                        Ver no ComprasNet
                                    </a>
                                </div>
                            </div>
                        </div>
                    </td>
                `;

                tr.addEventListener('click', () => {
                    const isExpanded = detailTr.classList.contains('expanded');
                    
                    // Close other expanded rows (optional, but cleaner)
                    document.querySelectorAll('.details-row.expanded').forEach(el => {
                        if (el !== detailTr) {
                            el.classList.remove('expanded');
                            el.previousElementSibling.classList.remove('expanded');
                        }
                    });

                    detailTr.classList.toggle('expanded');
                    tr.classList.toggle('expanded');
                });

                tbody.appendChild(tr);
                tbody.appendChild(detailTr);
            });
            
            if (window.lucide) lucide.createIcons();
        }

        function filterTableByStatus(statusVal) {
            const performTransition = () => {
                if(statusFilter) statusFilter.value = statusVal;
                if(yearFilter) yearFilter.value = 'all';
                if(searchInput) searchInput.value = '';
                applyFilters();
                
                navItems.forEach(n => n.classList.remove('active'));
                let contBtn = document.querySelector('[data-view="contratos"]');
                if (statusVal === 'A Vencer') {
                    contBtn = document.querySelector('[data-view="vencer-30"]');
                }
                if(contBtn) contBtn.classList.add('active');
                
                if(sectionKpis) sectionKpis.style.display = 'none';
                if(sectionCharts) sectionCharts.style.display = 'none';
                if(sectionValores) sectionValores.style.display = 'none';
                if(sectionTable) {
                    sectionTable.style.display = 'block';
                    sectionTable.scrollIntoView({ behavior: 'smooth' });
                }
            };

            if (document.startViewTransition) {
                document.startViewTransition(performTransition);
            } else {
                performTransition();
            }
        }

        function filterTableByMonth(monthYear) {
            const performTransition = () => {
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
                if(sectionValores) sectionValores.style.display = 'none';
                if(sectionTable) {
                    sectionTable.style.display = 'block';
                    sectionTable.scrollIntoView({ behavior: 'smooth' });
                }
            };

            if (document.startViewTransition) {
                document.startViewTransition(performTransition);
            } else {
                performTransition();
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
                    cutout: '75%',
                    radius: '80%',
                    onClick: (e, elements) => {
                        if (elements && elements.length > 0) {
                            const index = elements[0].index;
                            const status = statusChartInstance.data.labels[index];
                            filterTableByStatus(status === 'Ativos' ? 'Ativo' : 'Vencido');
                        }
                    },
                    onHover: (event, chartElement) => {
                        if(event.native && event.native.target) {
                            event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
                        }
                    },
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
                        pointRadius: 4,
                        hitRadius: 15,
                        hoverRadius: 6,
                        cursor: 'pointer'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
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
                            grid: { display: false },
                            ticks: { padding: 15 }
                        }
                    },
                    layout: {
                        padding: {
                            top: 20,
                            bottom: 20,
                            left: 15,
                            right: 15
                        }
                    }
                }
            });
        }

        function renderValoresChart(data) {
            const canvasValores = document.getElementById('valoresChart');
            if(!canvasValores || typeof Chart === 'undefined') return;

            const sortedData = [...data]
                .filter(c => c.valor_global)
                .sort((a, b) => parseCurrencyBR(b.valor_global) - parseCurrencyBR(a.valor_global))
                .slice(0, 20);
            
            const labels = sortedData.map(c => c.numero || 'Sem Nº');
            const values = sortedData.map(c => parseCurrencyBR(c.valor_global));
            const tooltips = sortedData.map(c => c.fornecedor ? c.fornecedor.nome : 'N/A');

            const ctxValores = canvasValores.getContext('2d');
            const colors = getChartColors();

            if (valoresChartInstance) valoresChartInstance.destroy();

            valoresChartInstance = new Chart(ctxValores, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Valor do Contrato',
                        data: values,
                        backgroundColor: colors.secondaryColor,
                        hoverBackgroundColor: colors.secondaryHover,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                title: (context) => 'Contrato: ' + context[0].label,
                                afterTitle: (context) => tooltips[context[0].dataIndex],
                                label: (context) => formatBRL(context.raw)
                            }
                        }
                    },
                    scales: {
                        y: {
                            grid: { color: colors.gridColor },
                            ticks: {
                                callback: (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumSignificantDigits: 3 }).format(value)
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: colors.textColor }
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
