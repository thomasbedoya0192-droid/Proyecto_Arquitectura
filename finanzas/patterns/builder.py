from finanzas.models import Transaccion


class TransactionBuilder:
    """
    Patrón Builder para la construcción paso a paso de Transacciones.
    Permite construir transacciones complejas mediante encadenamiento de métodos.
    """

    def __init__(self):
        self._transaction = Transaccion()

    def set_cuentas(self, origen, destino):
        """
        Configura las cuentas de origen y destino (para transferencias).
        """
        self._transaction.cuenta_origen = origen
        self._transaction.cuenta_destino = destino
        return self

    def set_cuentas_gasto(self, cuenta):
        """
        Configura la cuenta de origen para un gasto.
        """
        self._transaction.cuenta_origen = cuenta
        return self

    def set_cuentas_ingreso(self, cuenta):
        """
        Configura la cuenta de destino para un ingreso.
        """
        self._transaction.cuenta_destino = cuenta
        return self

    def set_detalles(self, monto, tipo, descripcion=""):
        """
        Configura los detalles básicos de la transacción.

        Args:
            monto: Cantidad de la transacción
            tipo: Tipo de transacción (ingreso, gasto, transferencia)
            descripcion: Descripción adicional
        """
        self._transaction.monto = monto
        self._transaction.tipo = tipo
        self._transaction.descripcion = descripcion
        return self

    def set_categoria(self, categoria):
        """
        Asigna una categoría a la transacción.
        """
        self._transaction.categoria = categoria
        return self

    def add_etiqueta(self, etiqueta):
        """
        Agrega una etiqueta a la transacción.
        Nota: Debe llamarse después de build() y save().
        """
        if self._transaction.pk:
            self._transaction.etiquetas.add(etiqueta)
        return self

    def set_creada_por_ia(self, valor: bool):
        """
        Marca la transacción como creada por IA.
        """
        self._transaction.creada_por_ia = valor
        return self

    def build(self):
        """
        Retorna la transacción construida.
        """
        return self._transaction
