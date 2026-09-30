from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sqlite3
from decimal import Decimal
from datetime import datetime

app = Flask(__name__)
CORS(app)

DATABASE_PATH = os.environ.get('DATABASE_PATH', '/data/db.sqlite3')

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def serialize_row(row):
    return {key: row[key] for key in row.keys()}

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'reportes-flask'}), 200

@app.route('/api/v2/reportes/financiero', methods=['GET'])
def reporte_financiero():
    usuario_id = request.args.get('usuario')
    cuenta_id = request.args.get('cuenta')

    if not usuario_id:
        return jsonify({'error': 'El parámetro usuario es requerido.'}), 400

    try:
        usuario_id = int(usuario_id)
        cuenta_id = int(cuenta_id) if cuenta_id else None
    except ValueError:
        return jsonify({'error': 'Parámetros inválidos.'}), 400

    conn = get_db_connection()
    try:
        query = "SELECT * FROM transacciones_transaccion WHERE usuario_id = ?"
        params = [usuario_id]

        if cuenta_id:
            query += " AND cuenta_id = ?"
            params.append(cuenta_id)

        cursor = conn.execute(query, params)
        transacciones = [serialize_row(row) for row in cursor.fetchall()]

        if not transacciones:
            return jsonify({
                'resumen': {
                    'total_ingresos': 0.0,
                    'total_gastos': 0.0,
                    'balance_neto': 0.0,
                    'total_transferencias_enviadas': 0.0,
                    'total_transferencias_recibidas': 0.0,
                    'cantidad_transacciones': 0
                },
                'desglose_reciente': []
            }), 200

        ingresos_total = sum(float(t['monto']) for t in transacciones if t['tipo'] == 'ingreso')
        gastos_total = sum(float(t['monto']) for t in transacciones if t['tipo'] == 'gasto')

        transferencias = [t for t in transacciones if t['tipo'] == 'transferencia']
        trans_enviadas = sum(float(t['monto']) for t in transferencias if 'enviada' in (t['descripcion'] or '').lower())
        trans_recibidas = sum(float(t['monto']) for t in transferencias if 'recibida' in (t['descripcion'] or '').lower())

        recientes = sorted(transacciones, key=lambda x: x['fecha'], reverse=True)[:10]
        desglose_reciente = []
        for t in recientes:
            cuenta_cursor = conn.execute("SELECT nombre FROM app_cuentabancaria WHERE id = ?", [t['cuenta_id']])
            cuenta_row = cuenta_cursor.fetchone()
            cuenta_nombre = cuenta_row['nombre'] if cuenta_row else 'Desconocida'

            desglose_reciente.append({
                'id': t['id'],
                'monto': float(t['monto']),
                'tipo': t['tipo'],
                'descripcion': t['descripcion'] or 'Sin descripción',
                'cuenta': cuenta_nombre,
                'fecha': t['fecha']
            })

        return jsonify({
            'resumen': {
                'total_ingresos': ingresos_total,
                'total_gastos': gastos_total,
                'balance_neto': ingresos_total - gastos_total,
                'total_transferencias_enviadas': trans_enviadas,
                'total_transferencias_recibidas': trans_recibidas,
                'cantidad_transacciones': len(transacciones)
            },
            'desglose_reciente': desglose_reciente
        }), 200

    except Exception as e:
        return jsonify({'error': f'Error interno: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/v2/reportes/transacciones', methods=['GET'])
def listar_transacciones():
    usuario_id = request.args.get('usuario')
    cuenta_id = request.args.get('cuenta')
    tipo = request.args.get('tipo')

    if not usuario_id and not cuenta_id:
        return jsonify({'error': 'Se requiere al menos el parámetro usuario o cuenta'}), 400

    conn = get_db_connection()
    try:
        query = "SELECT * FROM transacciones_transaccion WHERE 1=1"
        params = []

        if usuario_id:
            query += " AND usuario_id = ?"
            params.append(int(usuario_id))
        if cuenta_id:
            query += " AND cuenta_id = ?"
            params.append(int(cuenta_id))
        if tipo:
            query += " AND tipo = ?"
            params.append(tipo)

        query += " ORDER BY fecha DESC"

        cursor = conn.execute(query, params)
        transacciones = [serialize_row(row) for row in cursor.fetchall()]

        for t in transacciones:
            cuenta_cursor = conn.execute("SELECT nombre FROM app_cuentabancaria WHERE id = ?", [t['cuenta_id']])
            cuenta_row = cuenta_cursor.fetchone()
            t['cuenta_nombre'] = cuenta_row['nombre'] if cuenta_row else 'Desconocida'

        return jsonify(transacciones), 200

    except Exception as e:
        return jsonify({'error': f'Error interno: {str(e)}'}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)