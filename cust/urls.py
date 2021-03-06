"""syl URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/dev/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf.urls import url
from . import views
urlpatterns = [
    url(r'^register', views.register),
    url(r'^vcode', views.vcode),
    url(r'^logout', views.logout),
    url(r'^login', views.login),
    url(r'^refresh', views.refresh),
    url(r'^userstatus', views.user_status),
    url(r'^addgroup', views.add_group),
    url(r'^applygroup', views.apply_group),
    url(r'^approveuser', views.approve_user),
    url(r'^getgroupusers', views.get_group_users),
    url(r'^regws', views.regws),
    

]
