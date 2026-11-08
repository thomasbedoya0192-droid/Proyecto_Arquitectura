from django.urls import path
from . import views

urlpatterns = [
    # Wallet endpoints
    path('wallet/', views.wallet_detail, name='wallet-detail'),
    path('wallet/balance/', views.wallet_balance, name='wallet-balance'),  # legacy
    
    # Test cards
    path('test-cards/', views.test_cards_list, name='test-cards-list'),
    path('test-cards/reset/', views.reset_test_cards, name='test-cards-reset'),
    
    # Subscription endpoints
    path('upgrade/', views.upgrade_to_premium, name='upgrade-premium'),
    path('cancel/', views.cancel_premium, name='cancel-premium'),
    path('status/', views.subscription_status, name='subscription-status'),
    
    # Legacy endpoints (for backward compatibility)
    path('checkout/', views.wallet_detail, name='create-checkout'),  # deprecated
    path('portal/', views.subscription_status, name='customer-portal'),  # deprecated
]