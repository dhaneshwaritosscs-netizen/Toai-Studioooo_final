"""
Management command to create a Super Admin user
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from users.role_models import Role, UserRoleAssignment
from django.db import transaction
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class Command(BaseCommand):
    help = 'Create a Super Admin user with full system access'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            default='superadmin@gmail.com',
            help='Email address for the Super Admin user'
        )
        parser.add_argument(
            '--password',
            type=str,
            default='123456super',
            help='Password for the Super Admin user'
        )
        parser.add_argument(
            '--first-name',
            type=str,
            default='Super',
            help='First name for the Super Admin user'
        )
        parser.add_argument(
            '--last-name',
            type=str,
            default='Admin',
            help='Last name for the Super Admin user'
        )

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        first_name = options['first_name']
        last_name = options['last_name']

        try:
            with transaction.atomic():
                # Check if user already exists
                if User.objects.filter(email=email).exists():
                    self.stdout.write(
                        self.style.WARNING(f'User with email {email} already exists')
                    )
                    user = User.objects.get(email=email)
                else:
                    # Create the user
                    user = User.objects.create_user(
                        email=email,
                        username=email,
                        password=password,
                        first_name=first_name,
                        last_name=last_name,
                        is_active=True,
                        is_staff=True,
                        is_superuser=True
                    )
                    self.stdout.write(
                        self.style.SUCCESS(f'Created Super Admin user: {email}')
                    )

                # Create Super Admin role if it doesn't exist
                super_admin_role, created = Role.objects.get_or_create(
                    name='super-admin',
                    defaults={
                        'display_name': 'Super Admin',
                        'description': 'Full system access with ability to create and manage all users and roles',
                        'role_type': 'system',
                        'is_active': True
                    }
                )

                if created:
                    self.stdout.write(
                        self.style.SUCCESS('Created Super Admin role')
                    )

                # Assign Super Admin role to user
                assignment, created = UserRoleAssignment.objects.get_or_create(
                    user=user,
                    role=super_admin_role,
                    defaults={
                        'is_active': True,
                        'notes': 'System-created Super Admin role assignment'
                    }
                )

                if created:
                    self.stdout.write(
                        self.style.SUCCESS(f'Assigned Super Admin role to {email}')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'Super Admin role already assigned to {email}')
                    )

                # Also create Admin role if it doesn't exist
                admin_role, created = Role.objects.get_or_create(
                    name='admin',
                    defaults={
                        'display_name': 'Admin',
                        'description': 'Administrator with access to manage users and projects',
                        'role_type': 'system',
                        'is_active': True
                    }
                )

                if created:
                    self.stdout.write(
                        self.style.SUCCESS('Created Admin role')
                    )

                # Assign Admin role to Super Admin as well
                admin_assignment, created = UserRoleAssignment.objects.get_or_create(
                    user=user,
                    role=admin_role,
                    defaults={
                        'is_active': True,
                        'notes': 'System-created Admin role assignment for Super Admin'
                    }
                )

                if created:
                    self.stdout.write(
                        self.style.SUCCESS(f'Assigned Admin role to {email}')
                    )

                self.stdout.write(
                    self.style.SUCCESS(
                        f'Super Admin setup complete for {email}\n'
                        f'Password: {password}\n'
                        f'Roles: Super Admin, Admin'
                    )
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating Super Admin: {str(e)}')
            )
            logger.error(f'Error creating Super Admin: {str(e)}')
            raise
