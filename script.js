document.addEventListener('DOMContentLoaded', () => {
    
    const API_URL = '/api'; 
    const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    

    const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    

    let appState = {
        produtos: [],
        transacoes: [],
        mesSelecionado: -1 // -1 
    };


    let chartFluxoRef = null;
    let chartCatRef = null;
    let chartQtdRef = null;
    let chartShareRef = null;


    function showToast(title, message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return; 

        const toast = document.createElement('div');
        toast.className = `toast ${type}`; 
        
        let icon = '<i class="fa-solid fa-circle-info"></i>';
        if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
        if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation"></i>';
        
        toast.innerHTML = `
            <div style="font-size: 1.2rem; color: inherit;">${icon}</div>
            <div class="toast-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;

        container.appendChild(toast);

    
        setTimeout(() => toast.classList.add('show'), 100); 

    
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 5000);
    }

    window.showToast = showToast;


    async function fetchData() {
        const loaderScreen = document.getElementById('loader-screen');
        const loaderText = document.getElementById('loader-text');

        try {
          
            const [resProd, resTrans] = await Promise.all([
                fetch(`${API_URL}/produtos`),
                fetch(`${API_URL}/transacoes`)
            ]);
            
            if (!resProd.ok || !resTrans.ok) throw new Error("Falha na resposta do servidor");

            appState.produtos = await resProd.json();
            appState.transacoes = await resTrans.json();
            

            if (loaderScreen) {
                if(loaderText) loaderText.textContent = "Carregamento Concluído!";
                setTimeout(() => {
                    loaderScreen.style.opacity = '0';
                    setTimeout(() => { loaderScreen.style.display = 'none'; }, 500);
                }, 500);
            }


            routePageLogic();

        } catch (error) {
            console.error("ERRO GRAVE:", error);
            

            if(loaderText) {
                loaderText.textContent = "ERRO: Servidor Offline ou Inacessível.";
                loaderText.style.color = "red";
            }
            showToast("Erro de Conexão", "Não foi possível conectar ao Python/Flask. Verifique o terminal.", "error");


            setTimeout(() => {
                if(loaderScreen) loaderScreen.style.display = 'none';
            }, 2000);
        }
    }


    function routePageLogic() {
        const path = window.location.pathname;

        if (path.includes('detalhe_categoria.html')) {
            initDetalheCategoria();
        } else if (path.includes('metricas.html')) {
            renderMetricasPage();
        } else if (path.includes('compras.html')) {
            renderComprasPage();
        } else if (path.includes('relatorios.html')) {
            renderRelatoriosPage();
        } else {

            renderIndexPage();
        }
    }


    function renderIndexPage() {
        renderCalendar(); 
        renderTableMain(); 
        renderKPIsGerais(); 
        renderChartsGerais();
        
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('action') === 'nova_entrada') {
            openNewProductModal();
        }
    }

    function renderTableMain() {
        const tbody = document.getElementById('tbody-estoque');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        const termoBusca = document.getElementById('search-input') ? document.getElementById('search-input').value.toLowerCase() : "";

        const listaProcessada = appState.produtos.map(p => getSnapshotProduto(p, appState.mesSelecionado));
        
        const listaFiltrada = listaProcessada.filter(p => p.nome.toLowerCase().includes(termoBusca) || p.categoria.toLowerCase().includes(termoBusca));

        if (listaFiltrada.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:#64748b;">Nenhum produto encontrado.</td></tr>';
            return;
        }

        listaFiltrada.forEach(p => {
            const totalValor = p.estoque_calculado * p.custo;
            const status = p.status_calculado;
            
            const styleRow = status.critico ? 'background-color: #fef2f2;' : '';

            tbody.innerHTML += `
                <tr style="${styleRow}">
                    <td>#${p.id}</td>
                    <td><strong>${p.nome}</strong><br><small style="color:#64748b">${p.categoria}</small></td>
                    <td>${p.fornecedor}</td>
                    <td>${formatCurrency(p.custo)}</td>
                    <td>${formatCurrency(p.venda)}</td>
                    <td style="text-align:center; font-weight:bold; font-size:1.1em;">${p.estoque_calculado}</td>
                    <td>${formatCurrency(totalValor)}</td>
                    <td><span class="badge ${status.class}">${status.label}</span></td>
                    <td>
                        <button class="btn-action btn-add" onclick="openTransacaoModal(${p.id}, 'entrada')" title="Entrada">+</button>
                        <button class="btn-action btn-sub" onclick="openTransacaoModal(${p.id}, 'saida')" title="Saída">-</button>
                        <button class="btn-action btn-del" onclick="deletarProduto(${p.id})" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    }

    function renderChartsGerais() {
        const ctxFluxo = document.getElementById('chartFluxo');
        const ctxCat = document.getElementById('chartCategoria');
        if (!ctxFluxo || !ctxCat) return;

        
        const dadosMes = appState.transacoes.filter(t => 
            appState.mesSelecionado === -1 || t.mes_index === appState.mesSelecionado
        );

        
        const entradas = dadosMes.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + t.valor_total, 0);
        const saidas = dadosMes.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + t.valor_total, 0);

        if (chartFluxoRef) chartFluxoRef.destroy();
        chartFluxoRef = new Chart(ctxFluxo, {
            type: 'bar',
            data: {
                labels: ['Investimento (Compras)', 'Receita (Vendas)'],
                datasets: [{
                    label: 'R$',
                    data: [entradas, saidas],
                    backgroundColor: ['#ef4444', '#22c55e'],
                    borderRadius: 6,
                    barThickness: 50
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: {display:false} } }
        });

        
        const cats = {};
        dadosMes.filter(t => t.tipo === 'saida').forEach(t => {
            cats[t.categoria] = (cats[t.categoria] || 0) + t.valor_total;
        });

        if (chartCatRef) chartCatRef.destroy();
        chartCatRef = new Chart(ctxCat, {
            type: 'doughnut',
            data: {
                labels: Object.keys(cats),
                datasets: [{
                    data: Object.values(cats),
                    backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#6366f1'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                onClick: (evt, el) => {
                    if (el.length > 0) {
                        const index = el[0].index;
                        const catNome = Object.keys(cats)[index];
                        
                        window.location.href = `detalhe_categoria.html?categoria=${encodeURIComponent(catNome)}`;
                    }
                }
            }
        });
    }

    function initDetalheCategoria() {
        const urlParams = new URLSearchParams(window.location.search);
        const categoria = urlParams.get('categoria');

        if (!categoria) {
            document.getElementById('categoria-titulo').textContent = "Categoria não encontrada";
            return;
        }
        document.getElementById('categoria-titulo').textContent = categoria;

        
        const transacoesCat = appState.transacoes.filter(t => t.categoria === categoria && t.tipo === 'saida');

        
        const stats = {};
        transacoesCat.forEach(t => {
            if(!stats[t.produto_id]) stats[t.produto_id] = { nome: t.produto_nome, qtd: 0, receita: 0 };
            stats[t.produto_id].qtd += t.quantidade;
            stats[t.produto_id].receita += t.valor_total;
        });
        const lista = Object.values(stats);

        
        const totalQtd = lista.reduce((a, b) => a + b.qtd, 0);
        const totalRev = lista.reduce((a, b) => a + b.receita, 0);
        const topProd = lista.sort((a,b) => b.receita - a.receita)[0];

        document.getElementById('kpi-qtd').textContent = totalQtd;
        document.getElementById('kpi-valor').textContent = formatCurrency(totalRev);
        document.getElementById('kpi-top').textContent = topProd ? topProd.nome : "-";

        
        const ulQtd = document.getElementById('lista-qtd-vendida');
        const ulRec = document.getElementById('lista-receita-total');
        if(ulQtd) {
            ulQtd.innerHTML = '';
            [...lista].sort((a,b) => b.qtd - a.qtd).forEach((p, i) => {
                ulQtd.innerHTML += `<li>${i+1}. <strong>${p.nome}</strong>: ${p.qtd} un.</li>`;
            });
        }
        if(ulRec) {
            ulRec.innerHTML = '';
            [...lista].sort((a,b) => b.receita - a.receita).forEach((p, i) => {
                ulRec.innerHTML += `<li>${i+1}. <strong>${p.nome}</strong>: ${formatCurrency(p.receita)}</li>`;
            });
        }

        
        if(document.getElementById('chartQtd')) {
            if(chartQtdRef) chartQtdRef.destroy();
            chartQtdRef = new Chart(document.getElementById('chartQtd'), {
                type: 'bar',
                data: {
                    labels: lista.map(p => p.nome),
                    datasets: [{ label: 'Qtd', data: lista.map(p => p.qtd), backgroundColor: '#3b82f6' }]
                },
                options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
            });
        }
        if(document.getElementById('chartShare')) {
            if(chartShareRef) chartShareRef.destroy();
            chartShareRef = new Chart(document.getElementById('chartShare'), {
                type: 'doughnut',
                data: {
                    labels: lista.map(p => p.nome),
                    datasets: [{ data: lista.map(p => p.receita), backgroundColor: ['#10b981', '#f59e0b', '#6366f1', '#ef4444', '#3b82f6'] }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        
        const kpiCards = document.querySelectorAll('.kpi-card');
        kpiCards.forEach(card => {
            card.onclick = () => {

                document.querySelectorAll('.kpi-info-box-detalhe').forEach(b => b.classList.remove('active'));
                
                
                let targetId = '';
                if(card.id === 'card-kpi-qtd') targetId = 'info-produtos';
                if(card.id === 'card-kpi-receita') targetId = 'info-receita';
                if(card.id === 'card-kpi-top') targetId = 'info-top';
                
                const target = document.getElementById(targetId);
                if(target) target.classList.add('active');
            };
        });
    }

    function renderComprasPage() {
        const tbody = document.getElementById('tbody-compras');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        
        const compras = appState.transacoes.filter(t => t.tipo === 'entrada');
        
        compras.forEach(t => {
          
            const hoje = new Date();
            const partesData = t.data_movimento.split('/');
            const dataTransacao = new Date(partesData[2], partesData[1]-1, partesData[0]);
            const diasPassados = Math.floor((hoje - dataTransacao) / (1000 * 60 * 60 * 24));
            
            const status = diasPassados > 5 
                ? `<span class="badge bg-success">Recebido</span>` 
                : `<span class="badge bg-warning">A Caminho</span>`;

            tbody.innerHTML += `
                <tr>
                    <td>${t.data_movimento}</td>
                    <td><strong>${t.produto_nome}</strong></td>
                    <td>${t.motivo}</td>
                    <td>${t.quantidade}</td>
                    <td style="color:green;">${formatCurrency(t.valor_total)}</td>
                    <td>${status}</td>
                </tr>
            `;
        });
    }

    function renderRelatoriosPage() {
        const tbody = document.getElementById('tbody-relatorios');
        if(!tbody) return;
        tbody.innerHTML = '';

        
        const dados = appState.transacoes.filter(t => 
            (appState.mesSelecionado === -1 || t.mes_index === appState.mesSelecionado) && t.tipo === 'saida'
        );

        dados.forEach(t => {
            tbody.innerHTML += `
                <tr>
                    <td>${t.data_movimento}</td>
                    <td><strong>${t.produto_nome}</strong><br><small>${t.categoria}</small></td>
                    <td>${t.quantidade}</td>
                    <td style="color:#2563eb; font-weight:bold;">${formatCurrency(t.valor_total)}</td>
                    <td><span class="badge bg-info">Concluído</span></td>
                </tr>
            `;
        });
        
        
        const label = appState.mesSelecionado === -1 ? "(Ano Todo)" : `(${nomesMeses[appState.mesSelecionado]})`;
        document.querySelectorAll('.periodo-texto').forEach(el => el.textContent = label);
    }

    function renderMetricasPage() {
        renderCalendar(); 
        renderChartsGerais(); 
    }

    function getSnapshotProduto(produto, mesLimite) {
        if (mesLimite === -1) {
            
            return {
                ...produto,
                estoque_calculado: produto.estoque_atual,
                status_calculado: getClassificacaoEstoque(produto.estoque_atual, produto.estoque_min)
            };
        }

        
        let estoqueReverso = produto.estoque_atual;
        const transacoesFuturas = appState.transacoes.filter(t => 
            t.produto_id === produto.id && t.mes_index > mesLimite
        );

        transacoesFuturas.forEach(t => {
            if (t.tipo === 'entrada') estoqueReverso -= t.quantidade; 
            else estoqueReverso += t.quantidade; 
        });
        
        estoqueReverso = Math.max(0, estoqueReverso);

        return {
            ...produto,
            estoque_calculado: estoqueReverso,
            status_calculado: getClassificacaoEstoque(estoqueReverso, produto.estoque_min)
        };
    }

    function getClassificacaoEstoque(qtd, min) {
        if (qtd === 0) return { label: "Esgotado", class: "bg-danger", critico: true };
        if (qtd < min) return { label: "Crítico", class: "bg-danger", critico: true };
        if (qtd < min * 1.5) return { label: "Baixo", class: "bg-warning", critico: false };
        return { label: "Normal", class: "bg-success", critico: false };
    }

    
    function renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const btnAll = document.createElement('div');
        btnAll.className = `month-card ${appState.mesSelecionado === -1 ? 'active' : ''}`;
        btnAll.innerText = "VISÃO GERAL";
        btnAll.onclick = () => { appState.mesSelecionado = -1; refreshInterface(); };
        grid.appendChild(btnAll);

        nomesMeses.forEach((nome, index) => {
            const btn = document.createElement('div');
            btn.className = `month-card ${appState.mesSelecionado === index ? 'active' : ''}`;
            btn.innerText = nome.substring(0, 3);
            btn.onclick = () => { appState.mesSelecionado = index; refreshInterface(); };
            grid.appendChild(btn);
        });
    }
    
    function renderKPIsGerais() {
        const kpiTotal = document.getElementById('kpi-total');
        if(!kpiTotal) return;

        const dados = appState.produtos.map(p => getSnapshotProduto(p, appState.mesSelecionado));
        
        const totalItens = dados.reduce((acc, p) => acc + p.estoque_calculado, 0);
        const valorPatrimonial = dados.reduce((acc, p) => acc + (p.estoque_calculado * p.custo), 0);
        const criticos = dados.filter(p => p.status_calculado.critico).length;

        kpiTotal.textContent = totalItens;
        document.getElementById('kpi-valor').textContent = formatCurrency(valorPatrimonial);
        document.getElementById('kpi-critico').textContent = criticos;
    }

    
    function refreshInterface() {
        const path = window.location.pathname;
        if (path.includes('metricas.html')) renderMetricasPage();
        else if (path.includes('relatorios.html')) renderRelatoriosPage();
        else renderIndexPage();
        
        const label = appState.mesSelecionado === -1 ? "(Ano Todo)" : `(${nomesMeses[appState.mesSelecionado]})`;
        document.querySelectorAll('.periodo-texto').forEach(el => el.textContent = label);
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', renderTableMain);
    }

    
    window.openNewProductModal = () => {
        const modal = document.getElementById('modal-novo-produto');
        if(modal) modal.classList.add('open');
    };
    window.closeNewProductModal = () => {
        const modal = document.getElementById('modal-novo-produto');
        if(modal) modal.classList.remove('open');
    };

    window.salvarNovoProduto = async () => {
        const btn = document.querySelector('#modal-novo-produto .btn-primary');
        if(btn) { btn.innerHTML = "Salvando..."; btn.disabled = true; }

        const payload = {
            nome: document.getElementById('new-nome').value,
            categoria: document.getElementById('new-cat').value,
            fornecedor: document.getElementById('new-forn').value,
            compra: document.getElementById('new-custo').value,
            venda: document.getElementById('new-venda').value,
            min: 5,
            atual: document.getElementById('new-estoque').value
        };

        try {
            const res = await fetch(`${API_URL}/novo_produto`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            
            if(json.success) {
                showToast("Sucesso", "Produto cadastrado!", "success");
                closeNewProductModal();
                fetchData(); 
            } else {
                showToast("Erro", json.error, "error");
            }
        } catch(e) {
            showToast("Erro", "Falha na conexão.", "error");
        }
        
        if(btn) { btn.innerHTML = "Salvar no Banco de Dados"; btn.disabled = false; }
    };

    window.openTransacaoModal = (id, tipo) => {
        const prod = appState.produtos.find(p => p.id === id);
        if(!prod) return;

        document.getElementById('modal-title').innerText = tipo === 'entrada' ? "Nova Entrada" : "Nova Saída";
        document.getElementById('modal-prod-nome').value = prod.nome;
        document.getElementById('form-qtd').value = 1;
        
        const modal = document.getElementById('modal-transacao');
        modal.classList.add('open');

        const btn = document.getElementById('btn-confirm-transacao');
        
        const novoBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(novoBtn, btn);

        novoBtn.onclick = async () => {
            novoBtn.innerHTML = "Processando..."; novoBtn.disabled = true;
            const qtd = document.getElementById('form-qtd').value;
            const motivo = document.getElementById('form-motivo').value;

            try {
                const res = await fetch(`${API_URL}/transacao`, {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({id, tipo, qtd, motivo})
                });
                const json = await res.json();
                if(json.success) {
                    showToast("Sucesso", `Movimentação registrada.`, "success");
                    closeModal();
                    fetchData();
                } else {
                    showToast("Erro", json.error, "error");
                }
            } catch(e) {
                showToast("Erro", "Erro de conexão.", "error");
            }
            novoBtn.innerHTML = "Confirmar"; novoBtn.disabled = false;
        };
    };

    window.closeModal = () => {
        const modal = document.getElementById('modal-transacao');
        if(modal) modal.classList.remove('open');
    };

    window.deletarProduto = async (id) => {
        if(!confirm("Tem certeza que deseja apagar este produto e todo seu histórico?")) return;
        
        try {
            const res = await fetch(`${API_URL}/produto/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if(json.success) {
                showToast("Deletado", "Produto removido.", "success");
                fetchData();
            } else {
                showToast("Erro", json.error, "error");
            }
        } catch(e) {
            showToast("Erro", "Erro ao tentar deletar.", "error");
        }
    };
    
    window.openMenu = () => {
        document.querySelector('.sidebar').classList.add('active');
        const overlay = document.getElementById('overlay');
        if(overlay) overlay.classList.add('visible');
    };
    window.closeMenu = () => {
        document.querySelector('.sidebar').classList.remove('active');
        const overlay = document.getElementById('overlay');
        if(overlay) overlay.classList.remove('visible');
    };

    fetchData(); 
});
