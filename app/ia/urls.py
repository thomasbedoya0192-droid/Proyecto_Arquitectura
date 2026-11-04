from django.urls import path
from .views import (
    ContextoFinancieroView,
    FeedbackIAView,
    FeedbackStatsView,
    FeedbackFullView,
)

urlpatterns = [
    path('contexto/', ContextoFinancieroView.as_view(), name='contexto_financiero'),
    path('feedback/', FeedbackIAView.as_view(), name='feedback_ia'),
    path('feedback/stats/', FeedbackStatsView.as_view(), name='feedback_stats'),
    path('feedback/full/', FeedbackFullView.as_view(), name='feedback_full'),
]