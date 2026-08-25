from finanzas.models import Transaccion


class TransactionBuilder:
    def __init__(self):
        self._transaction = Transaccion()

    def set_cuentas(self, origen, destino):
        self._transaction.cuenta_origen = origen
        self._transaction.cuenta_destino = destino
        return self

    def set_detalles(self, monto, tipo, descripcion=""):
        self._transaction.monto = monto
        self._transaction.tipo = tipo
        self._transaction.descripcion = descripcion
        return self

    def build(self):
        return self._transaction
