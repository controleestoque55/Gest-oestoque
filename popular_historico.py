import sqlite3
import random
import sys
import os # Importar sys e os para checar o arquivo do banco
from datetime import datetime, timedelta

# Configurações
DB_NAME = "estoque_enterprise.db"
ANO_ATUAL = datetime.now().year

# Listas para gerar variedade nos dados
MOTIVOS_SAIDA = ["Venda Online", "Venda Balcão", "Venda Corporativa", "Marketplace"]
MOTIVOS_ENTRADA = ["Compra Regular", "Reposição Estoque", "Importação", "Devolução Fornecedor"]

def conectar():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def gerar_historico():
    # CORREÇÃO: Verifica se o arquivo do banco existe antes de tentar conectar
    if not os.path.exists(DB_NAME):
        print(f"❌ ERRO: O arquivo '{DB_NAME}' não foi encontrado.")
        print("DICA: Execute o arquivo 'seed_data.py' primeiro para criar o banco.")
        return

    conn = conectar()
    cursor = conn.cursor()

    # 1. Busca os produtos existentes para usar os dados reais deles
    print("--- Lendo catálogo de produtos... ---")
    try:
        cursor.execute("SELECT * FROM produtos")
        produtos = [dict(row) for row in cursor.fetchall()]
    except sqlite3.OperationalError:
        print("❌ ERRO: A tabela 'produtos' não existe.")
        print("SOLUÇÃO: Rode 'python seed_data.py' primeiro.")
        return

    if not produtos:
        print("ERRO: Nenhum produto encontrado. Rode o 'seed_data.py' primeiro!")
        return

    print(f"--- Gerando movimentações para {len(produtos)} produtos ao longo do ano... ---")

    total_transacoes = 0
    
    # 2. Loop pelos meses (0 = Janeiro, 11 = Dezembro)
    mes_atual_real = datetime.now().month - 1
    
    for mes_index in range(12): # De Jan a Dez
        if mes_index > mes_atual_real: 
            break # Não gera dados para o futuro
            
        # Define quantas transações teremos neste mês (aleatório para o gráfico variar)
        qtd_transacoes = random.randint(10, 30) 
        
        print(f" > Gerando dados para o Mês {mes_index + 1} ({qtd_transacoes} operações)...")

        for _ in range(qtd_transacoes):
            # Escolhe um produto aleatório
            prod = random.choice(produtos)
            
            # Decide se é Venda (Saída) ou Compra (Entrada)
            if random.random() < 0.7:
                tipo = "saida"
                motivo = random.choice(MOTIVOS_SAIDA)
                qtd = random.randint(1, 5) # Vende de 1 a 5 itens
                valor_unitario = prod['venda']
            else:
                tipo = "entrada"
                motivo = random.choice(MOTIVOS_ENTRADA)
                qtd = random.randint(5, 20) # Compra lotes maiores
                valor_unitario = prod['custo']

            valor_total = qtd * valor_unitario
            
            # Gera uma data aleatória dentro daquele mês
            dia = random.randint(1, 28)
            data_movimento = f"{dia:02d}/{mes_index + 1:02d}/{ANO_ATUAL}"
            
            # Insere no Histórico (Tabela movimentacoes)
            cursor.execute("""
                INSERT INTO movimentacoes (
                    produto_id, produto_nome, categoria, tipo, 
                    quantidade, data_movimento, mes_index, motivo, valor_total
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                prod['id'], prod['nome'], prod['categoria'], tipo,
                qtd, data_movimento, mes_index, motivo, valor_total
            ))
            
            total_transacoes += 1

    conn.commit()
    conn.close()
    print("---------------------------------------------------")
    print(f"✅ SUCESSO! {total_transacoes} transações históricas geradas.")
    print("Agora seus gráficos de Compras, Vendas e Métricas vão funcionar por mês!")
    print("---------------------------------------------------")

if __name__ == "__main__":
    gerar_historico()
