from django.db import migrations, models
import django.db.models.deletion
from decimal import Decimal


class Migration(migrations.Migration):

    dependencies = [
        ('finanzas', '0002_alter_tope_umbral_alerta'),
    ]

    operations = [
        migrations.CreateModel(
            name='Categoria',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=100, unique=True)),
                ('descripcion', models.TextField(blank=True)),
                ('color', models.CharField(default='#000000', help_text='Color en formato hexadecimal (ej. #FF5733)', max_length=7)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name_plural': 'Categorias',
                'ordering': ['nombre'],
            },
        ),
        migrations.CreateModel(
            name='Etiqueta',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=50, unique=True)),
                ('descripcion', models.TextField(blank=True)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['nombre'],
            },
        ),
        migrations.AlterField(
            model_name='cuenta',
            name='nombre',
            field=models.CharField(max_length=100),
        ),
        migrations.AddField(
            model_name='cuenta',
            name='activa',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='cuenta',
            name='fecha_creacion',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name='cuenta',
            name='moneda',
            field=models.CharField(default='COP', help_text='Código ISO de la moneda (ej. COP, USD, EUR)', max_length=3),
        ),
        migrations.AddField(
            model_name='cuenta',
            name='tipo',
            field=models.CharField(
                choices=[('banco', 'Cuenta Bancaria'), ('efectivo', 'Efectivo'), ('tarjeta', 'Tarjeta de Crédito'), ('digital', 'Billetera Digital'), ('ahorros', 'Cuenta de Ahorros')],
                default='banco',
                max_length=20
            ),
        ),
        migrations.AlterField(
            model_name='tope',
            name='umbral_alerta',
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal('80.00'),
                help_text='Porcentaje de consumo para disparar la alerta (0-100)',
                max_digits=5
            ),
        ),
        migrations.AddField(
            model_name='tope',
            name='activo',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='tope',
            name='limite_mensual',
            field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), help_text='Límite de gasto mensual', max_digits=12),
        ),
        migrations.AddField(
            model_name='transaccion',
            name='categoria',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='transacciones', to='finanzas.categoria'),
        ),
        migrations.AddField(
            model_name='transaccion',
            name='sincronizada',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='transaccion',
            name='etiquetas',
            field=models.ManyToManyField(blank=True, related_name='transacciones', to='finanzas.etiqueta'),
        ),
        migrations.CreateModel(
            name='Presupuesto',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('monto_limite', models.DecimalField(decimal_places=2, max_digits=12)),
                ('monto_gastado', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
                ('porcentaje_alerta', models.IntegerField(default=80, help_text='Porcentaje del presupuesto para disparar alerta (0-100)')),
                ('fecha_inicio', models.DateField()),
                ('fecha_fin', models.DateField()),
                ('activo', models.BooleanField(default=True)),
                ('categoria', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='presupuestos', to='finanzas.categoria')),
                ('cuenta', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='presupuestos', to='finanzas.cuenta')),
            ],
            options={
                'ordering': ['-fecha_inicio'],
                'unique_together': {('cuenta', 'categoria', 'fecha_inicio')},
            },
        ),
        migrations.AddIndex(
            model_name='transaccion',
            index=models.Index(fields=['cuenta_origen', '-fecha'], name='finanzas_tr_cuenta__idx'),
        ),
        migrations.AddIndex(
            model_name='transaccion',
            index=models.Index(fields=['categoria', '-fecha'], name='finanzas_tr_categor_idx'),
        ),
    ]
