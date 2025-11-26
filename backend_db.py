import sqlite3
from datetime import datetime

class ControleEstoqueDB:
    def __init__(self, db_name="estoque_enterprise.db"):
        self.db_name = db_name
        self.criar_tabelas()

    def _get_conn(self):
        conn = sqlite3.connect(self.db_name)
        conn.row_factory = sqlite3.Row 
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def criar_tabelas(self):
        with self._get_conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS produtos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    categoria TEXT,
                    fornecedor TEXT,
                    custo REAL NOT NULL,
                    venda REAL NOT NULL,
                    estoque_min INTEGER DEFAULT 0,
                    estoque_atual INTEGER DEFAULT 0
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS movimentacoes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    produto_id INTEGER NOT NULL,
                    produto_nome TEXT,
                    categoria TEXT,
                    tipo TEXT NOT NULL,
                    quantidade INTEGER NOT NULL,
                    data_movimento TEXT NOT NULL,
                    mes_index INTEGER,
                    motivo TEXT,
                    valor_total REAL,
                    FOREIGN KEY (produto_id) REFERENCES produtos (id) ON DELETE CASCADE
                )
            """)

    def contar_produtos(self):
        """Retorna quantos produtos existem no banco."""
        with self._get_conn() as conn:
            cursor = conn.execute("SELECT COUNT(*) as qtd FROM produtos")
            return cursor.fetchone()['qtd']

    def listar_produtos(self):
        with self._get_conn() as conn:
            cursor = conn.execute("SELECT * FROM produtos")
            return [dict(row) for row in cursor.fetchall()]

    def listar_transacoes(self, categoria=None):
        with self._get_conn() as conn:
            sql = "SELECT * FROM movimentacoes"
            params = []
            if categoria:
                sql += " WHERE categoria = ?"
                params.append(categoria)
            sql += " ORDER BY id DESC"
            cursor = conn.execute(sql, params)
            return [dict(row) for row in cursor.fetchall()]

    def adicionar_produto(self, nome, cat, forn, custo, venda, min_q, atual):
        with self._get_conn() as conn:
            conn.execute("""
                INSERT INTO produtos (nome, categoria, fornecedor, custo, venda, estoque_min, estoque_atual)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (nome, cat, forn, custo, venda, min_q, atual))

    def excluir_produto(self, prod_id):
        with self._get_conn() as conn:
            cursor = conn.execute("DELETE FROM produtos WHERE id = ?", (prod_id,))
            return cursor.rowcount > 0

    def registrar_transacao(self, prod_id, tipo, qtd, motivo):
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM produtos WHERE id = ?", (prod_id,))
            prod = cursor.fetchone()
            
            if not prod:
                raise ValueError("Produto não encontrado no banco de dados.")

            estoque_atual = prod['estoque_atual']
            if tipo == 'saida' and estoque_atual < qtd:
                raise ValueError(f"Estoque insuficiente! Disponível: {estoque_atual}, Solicitado: {qtd}")

            valor_unitario = prod['custo'] if tipo == 'entrada' else prod['venda']
            valor_total = qtd * valor_unitario
            
            novo_estoque = estoque_atual + qtd if tipo == 'entrada' else estoque_atual - qtd
            
            agora = datetime.now()
            data_str = agora.strftime("%d/%m/%Y")
            mes_idx = agora.month - 1  

            cursor.execute("UPDATE produtos SET estoque_atual = ? WHERE id = ?", (novo_estoque, prod_id))

            cursor.execute("""
                INSERT INTO movimentacoes (
                    produto_id, produto_nome, categoria, tipo, 
                    quantidade, data_movimento, mes_index, motivo, valor_total
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (prod_id, prod['nome'], prod['categoria'], tipo, qtd, data_str, mes_idx, motivo, valor_total))

            conn.commit()
            return True

        except Exception as e:
            conn.rollback() 
            raise e 
        finally:
            conn.close()
