import logging
from decimal import Decimal
from datetime import timedelta

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import Wallet, TestCard, WalletTransaction, Subscription, PaymentHistory

logger = logging.getLogger(__name__)

PREMIUM_MONTHLY_PRICE = Decimal('9.99')


def get_or_create_wallet(user):
    """Get or create wallet for user"""
    wallet, created = Wallet.objects.get_or_create(user=user)
    return wallet


def get_or_create_subscription(user):
    """Get or create subscription for user"""
    subscription, created = Subscription.objects.get_or_create(user=user)
    return subscription


def ensure_test_cards(user):
    """Ensure user has all predefined test cards"""
    return TestCard.create_predefined_cards(user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def wallet_detail(request):
    """
    Get user's wallet balance and test cards
    """
    user = request.user
    wallet = get_or_create_wallet(user)
    cards = ensure_test_cards(user)
    from decimal import Decimal
    PREMIUM_PRICE = Decimal('9.99')

    # Get recent transactions
    transactions = wallet.transactions.all()[:20]

    return Response({
        'wallet': {
            'balance': str(wallet.balance),
            'currency': 'USD',
        },
        'test_cards': [
            {
                'id': card.id,
                'card_type': card.card_type,
                'display_name': card.get_card_type_display(),
                'last4': card.last4,
                'brand': card.brand,
                'balance': str(card.balance),
                'is_default': card.is_default,
                'can_afford_premium': card.balance >= PREMIUM_PRICE,
            }
            for card in cards
        ],
        'recent_transactions': [
            {
                'amount': str(t.amount),
                'type': t.type,
                'description': t.description,
                'balance_after': str(t.balance_after),
                'created_at': t.created_at.isoformat(),
            }
            for t in transactions
        ]
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upgrade_to_premium(request):
    """
    Upgrade user to Premium using wallet balance or test card
    Expected payload: {
        "payment_method": "wallet" or "test_card",
        "test_card_id": <id> (required if payment_method is test_card)
    }
    """
    user = request.user
    payment_method = request.data.get('payment_method', 'wallet')
    test_card_id = request.data.get('test_card_id')

    subscription = get_or_create_subscription(user)

    # Check if already premium
    if subscription.is_premium():
        return Response({
            'error': 'Ya tienes una suscripción Premium activa',
            'subscription_status': get_subscription_status(user)
        }, status=status.HTTP_400_BAD_REQUEST)

    # Check expiration first
    subscription.check_and_expire()
    if subscription.is_premium():
        return Response({
            'error': 'Ya tienes una suscripción Premium activa',
            'subscription_status': get_subscription_status(user)
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        if payment_method == 'wallet':
            wallet = get_or_create_wallet(user)
            if not wallet.can_afford(PREMIUM_MONTHLY_PRICE):
                return Response({
                    'error': f'Saldo insuficiente en billetera. Necesitas ${PREMIUM_MONTHLY_PRICE}, tienes ${wallet.balance}',
                    'wallet_balance': str(wallet.balance),
                    'required': str(PREMIUM_MONTHLY_PRICE)
                }, status=status.HTTP_400_BAD_REQUEST)

            # Deduct from wallet
            wallet.deduct_funds(PREMIUM_MONTHLY_PRICE, f"Premium upgrade - ${PREMIUM_MONTHLY_PRICE}/mes")
            payment_method_used = 'wallet'

        elif payment_method == 'test_card':
            if not test_card_id:
                return Response({
                    'error': 'Se requiere test_card_id para pago con tarjeta de prueba'
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                card = TestCard.objects.get(id=test_card_id, user=user)
            except TestCard.DoesNotExist:
                return Response({
                    'error': 'Tarjeta de prueba no encontrada'
                }, status=status.HTTP_404_NOT_FOUND)

            if not card.can_afford(PREMIUM_MONTHLY_PRICE):
                return Response({
                    'error': f'Saldo insuficiente en {card.get_card_type_display()}. Necesitas ${PREMIUM_MONTHLY_PRICE}, tiene ${card.balance}',
                    'card_balance': str(card.balance),
                    'required': str(PREMIUM_MONTHLY_PRICE)
                }, status=status.HTTP_400_BAD_REQUEST)

            # Charge test card
            card.charge(PREMIUM_MONTHLY_PRICE, f"Premium upgrade - ${PREMIUM_MONTHLY_PRICE}/mes")
            payment_method_used = f'test_card_{card.card_type}'

        else:
            return Response({
                'error': 'Método de pago inválido. Use "wallet" o "test_card"'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Activate premium
        subscription.activate_premium()

        # Record payment
        PaymentHistory.objects.create(
            user=user,
            subscription=subscription,
            amount=PREMIUM_MONTHLY_PRICE,
            currency='usd',
            type='subscription',
            status='succeeded',
            description=f'Premium upgrade via {payment_method_used} - ${PREMIUM_MONTHLY_PRICE}/mes',
            metadata={'payment_method': payment_method_used}
        ).mark_succeeded()

        logger.info(f"User {user.username} upgraded to Premium via {payment_method_used}")

        return Response({
            'success': True,
            'message': '¡Actualizado a Premium exitosamente!',
            'subscription_status': get_subscription_status(user)
        })

    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.exception(f"Error upgrading user {user.username}: {e}")
        return Response({'error': 'Error interno del servidor'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_premium(request):
    """
    Cancel premium subscription (stops at period end, no refund)
    """
    user = request.user
    subscription = get_or_create_subscription(user)

    if not subscription.is_premium():
        return Response({
            'error': 'No tienes una suscripción Premium activa'
        }, status=status.HTTP_400_BAD_REQUEST)

    subscription.cancel_premium()

    return Response({
        'success': True,
        'message': 'Suscripción Premium cancelada. Tendrás acceso hasta el final del período actual.',
        'subscription_status': get_subscription_status(user)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subscription_status(request):
    """
    Get current user's subscription status
    """
    user = request.user
    return Response(get_subscription_status(user))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_cards_list(request):
    """
    Get all test cards for the user
    """
    user = request.user
    cards = ensure_test_cards(user)

    return Response({
        'test_cards': [
            {
                'id': card.id,
                'card_type': card.card_type,
                'display_name': card.get_card_type_display(),
                'last4': card.last4,
                'brand': card.brand,
                'balance': str(card.balance),
                'is_default': card.is_default,
                'can_afford_premium': card.can_afford(Decimal('9.99')),
            }
            for card in cards
        ]
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_test_cards(request):
    """
    Reset all test cards to their default balances (for testing)
    """
    user = request.user
    cards = TestCard.objects.filter(user=user)

    defaults = {
        'visa_rich': Decimal('1000.00'),
        'visa_poor': Decimal('5.00'),
        'mastercard_rich': Decimal('500.00'),
        'mastercard_poor': Decimal('1.00'),
        'amex_rich': Decimal('2000.00'),
        'amex_poor': Decimal('0.00'),
    }

    for card in cards:
        if card.card_type in defaults:
            card.balance = defaults[card.card_type]
            card.save()

    return Response({
        'message': 'Tarjetas de prueba reiniciadas a saldos por defecto',
        'test_cards': [
            {
                'id': card.id,
                'display_name': card.get_card_type_display(),
                'balance': str(card.balance),
            }
            for card in cards
        ]
    })


def get_subscription_status(user):
    """Helper to get subscription status dict"""
    subscription = get_or_create_subscription(user)
    subscription.check_and_expire()  # Auto-expire if needed
    wallet = get_or_create_wallet(user)

    return {
        'plan': subscription.plan,
        'status': subscription.status,
        'is_premium': subscription.is_premium(),
        'current_period_end': subscription.current_period_end.isoformat() if subscription.current_period_end else None,
        'cancel_at_period_end': subscription.cancel_at_period_end,
        'monthly_price': str(Subscription.MONTHLY_PRICE),
        'wallet_balance': str(wallet.balance),
    }


# Keep for backward compatibility - redirect to new endpoints
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def wallet_balance(request):
    """Legacy endpoint - redirects to wallet_detail"""
    return wallet_detail(request)