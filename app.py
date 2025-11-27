import sys
import os
import logging
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

try:
    from backend_db import ControleEstoqueDB
    
    import seed_data 
    import popular_historico
except ImportError as e:
    print(f"ERRO CRÍTICO: Faltando arquivo Python: {e}")
    sys.exit(1)

logging.basicConfig(level=logging.INFO)


app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app) 


try:
    db = ControleEstoqueDB()
except Exception as e:
    logging.error(f"Erro ao conectar no banco: {e}")
    sys.exit(1)


def verificar_e_popular_banco():
    """Verifica se o banco está vazio e roda os scripts de população automaticamente."""
    qtd = db.contar_produtos()
    if qtd == 0:
        print("\n" + "!"*50)
        print(" BANCO DE DADOS VAZIO DETECTADO!")
        print(" Iniciando população automática (Seed + Histórico)...")
        print("!"*50 + "\n")
        

        seed_data.popular_banco()
        popular_historico.gerar_historico()
        
        print("\n✅ Banco de dados configurado com sucesso!\n")
    else:
        print(f"ℹ️ Banco de dados já contem {qtd} produtos. Iniciando servidor...")


def safe_float(value):
    try:
        if isinstance(value, str): value = value.replace(',', '.')
        return float(value) if value else 0.0
    except: return 0.0

def safe_int(value):
    try:
        return int(float(value)) if value else 0
    except: return 0


@app.route('/')
def index():
    
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)


@app.route('/api/produtos', methods=['GET'])
def get_produtos():
    return jsonify(db.listar_produtos())

@app.route('/api/transacoes', methods=['GET'])
def get_transacoes():
    return jsonify(db.listar_transacoes())

@app.route('/api/transacao', methods=['POST'])
def nova_transacao():
    dados = request.json
    try:
        prod_id = safe_int(dados.get('id')) 
        tipo = dados.get('tipo')
        qtd = safe_int(dados.get('qtd'))
        motivo = dados.get('motivo', 'Geral')

        if qtd <= 0: return jsonify({"success": False, "error": "Qtd deve ser positiva"}), 400

        db.registrar_transacao(prod_id, tipo, qtd, motivo)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/novo_produto', methods=['POST'])
def novo_produto_rota():
    d = request.json
    try:
        nome = d.get('nome')
        if not nome: return jsonify({"success": False, "error": "Nome obrigatório"}), 400

        db.adicionar_produto(
            nome, d.get('categoria', 'Geral'), d.get('fornecedor', 'Div'), 
            safe_float(d.get('compra')), safe_float(d.get('venda')), 
            safe_int(d.get('min', 5)), safe_int(d.get('atual', 0))
        )
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/produto/<int:prod_id>', methods=['DELETE'])
def deletar_produto_rota(prod_id):
    if db.excluir_produto(prod_id): return jsonify({"success": True})
    return jsonify({"success": False, "error": "Não encontrado"}), 404


if __name__ == '__main__':
    
    verificar_e_popular_banco()

    print("\n" + "="*40)
    print(" 🚀 SISTEMA COMPLETO RODANDO")
    print(" ACESSE O SITE AQUI: http://127.0.0.1:8000")
    print(" (Não use mais a porta 5500 ou Live Server)")
    print("="*40 + "\n")
    
    app.run(debug=True, host='127.0.0.1', port=8000)
