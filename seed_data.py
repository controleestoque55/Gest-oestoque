import sys
import os

# --- VERIFICAÇÃO DE IMPORTAÇÃO (BANCO) ---
try:
    from backend_db import ControleEstoqueDB
except ImportError:
    print("\n" + "="*60)
    print("ERRO: O Python não achou 'backend_db.py'.")
    print("SOLUÇÃO: Abra a PASTA do projeto no VS Code, não só o arquivo.")
    print("="*60 + "\n")
    sys.exit(1)

def popular_banco():
    try:
        db = ControleEstoqueDB()
    except Exception as e:
        print(f"Erro ao conectar no banco: {e}")
        return

    print("--- Iniciando verificação e cadastro de produtos ---")

    # Lista de produtos (Nome, Categoria, Fornecedor, Custo, Venda, Min, Atual)
    produtos_ficticios = [
        # Apple
        ("iPhone 15 Pro 128GB", "Smartphones", "Apple Dist.", 5200.00, 7800.00, 10, 25),
        ("iPhone 14 128GB", "Smartphones", "Apple Dist.", 3800.00, 5200.00, 15, 8),
        ("MacBook Air M2", "Notebooks", "Apple Dist.", 6500.00, 8900.00, 5, 3),
        ("AirPods Pro 2", "Acessórios", "Apple Dist.", 1100.00, 1800.00, 20, 45),
        ("iPad Air 5ª Ger", "Tablets", "Apple Dist.", 3200.00, 4900.00, 8, 12),
        # Samsung
        ("Samsung Galaxy S24 Ultra", "Smartphones", "Samsung Electronics", 5800.00, 8500.00, 10, 18),
        ("Samsung Galaxy A54", "Smartphones", "Samsung Electronics", 1200.00, 1900.00, 25, 50),
        ("Smart TV 55' 4K Crystal", "Televisores", "Samsung Electronics", 2100.00, 3200.00, 5, 10),
        ("Monitor Gamer Odyssey 27'", "Monitores", "Samsung Electronics", 1400.00, 2300.00, 6, 15),
        ("Galaxy Watch 6", "Wearables", "Samsung Electronics", 900.00, 1600.00, 12, 22),
        # Outras Marcas
        ("LG OLED TV 65' C3", "Televisores", "LG Brasil", 6800.00, 9500.00, 3, 2),
        ("Soundbar JBL 5.1", "Áudio", "JBL Harman", 1800.00, 2900.00, 4, 7),
        ("Caixa JBL Charge 5", "Áudio", "JBL Harman", 650.00, 1100.00, 15, 30),
        ("Headphone Sony WH-1000XM5", "Áudio", "Sony Latam", 1900.00, 2800.00, 5, 9),
        # Informática
        ("Notebook Dell Inspiron i5", "Notebooks", "Dell Computadores", 2800.00, 3900.00, 10, 14),
        ("Notebook Lenovo IdeaPad", "Notebooks", "Lenovo Brasil", 2300.00, 3400.00, 10, 20),
        ("Monitor LG Ultrawide 29'", "Monitores", "LG Brasil", 950.00, 1500.00, 8, 5),
        ("Teclado Mecânico Logitech", "Periféricos", "Logitech", 450.00, 850.00, 10, 35),
        ("Mouse Logitech MX Master", "Periféricos", "Logitech", 380.00, 650.00, 15, 28),
        ("Roteador TP-Link WiFi 6", "Redes", "TP-Link", 250.00, 550.00, 20, 40),
        # Acessórios e Games
        ("Cabo USB-C 2m Reforçado", "Acessórios", "Baseus", 15.00, 60.00, 50, 120),
        ("Carregador Rápido 20W", "Acessórios", "Gorila Shield", 25.00, 90.00, 40, 85),
        ("Suporte Notebook Alumínio", "Acessórios", "Importado", 40.00, 120.00, 20, 15),
        ("Webcam Full HD Logitech", "Periféricos", "Logitech", 180.00, 350.00, 10, 8),
        ("HD Externo 1TB Toshiba", "Armazenamento", "Toshiba", 220.00, 450.00, 10, 18),
        ("SSD NVMe 1TB Kingston", "Armazenamento", "Kingston", 280.00, 580.00, 15, 25),
        ("PlayStation 5 Slim", "Games", "Sony Latam", 3100.00, 4200.00, 8, 12),
        ("Controle DualSense PS5", "Games", "Sony Latam", 300.00, 480.00, 20, 35),
        ("Nintendo Switch OLED", "Games", "Nintendo", 1900.00, 2600.00, 10, 6)
    ]

    # CORREÇÃO: Cria um conjunto com os nomes que JÁ existem no banco para evitar duplicatas
    produtos_existentes = {p['nome'] for p in db.listar_produtos()}

    contador_novos = 0
    for prod in produtos_ficticios:
        nome_produto = prod[0]
        
        if nome_produto in produtos_existentes:
            print(f"⚠️  Pular: {nome_produto} (Já existe)")
        else:
            db.adicionar_produto(prod[0], prod[1], prod[2], prod[3], prod[4], prod[5], prod[6])
            print(f"✅ Adicionado: {nome_produto}")
            contador_novos += 1

    print("-" * 50)
    print(f"RELATÓRIO: {contador_novos} novos produtos inseridos.")
    print("-" * 50)

if __name__ == "__main__":
    popular_banco()
