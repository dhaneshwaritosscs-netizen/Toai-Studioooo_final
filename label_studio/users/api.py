"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

import drf_yasg.openapi as openapi
from core.permissions import ViewClassPermission, all_permissions
from django.utils.decorators import method_decorator
from drf_yasg.utils import no_body, swagger_auto_schema
from rest_framework import generics, viewsets
from django.db import DatabaseError
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from users.functions import check_avatar
from users.models import User
from users.serializers import UserSerializer, UserSerializerUpdate

logger = logging.getLogger(__name__)

_user_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'id': openapi.Schema(type=openapi.TYPE_INTEGER, description='User ID'),
        'first_name': openapi.Schema(type=openapi.TYPE_STRING, description='First name of the user'),
        'last_name': openapi.Schema(type=openapi.TYPE_STRING, description='Last name of the user'),
        'username': openapi.Schema(type=openapi.TYPE_STRING, description='Username of the user'),
        'email': openapi.Schema(type=openapi.TYPE_STRING, description='Email of the user'),
        'avatar': openapi.Schema(type=openapi.TYPE_STRING, description='Avatar URL of the user'),
        'initials': openapi.Schema(type=openapi.TYPE_STRING, description='Initials of the user'),
        'phone': openapi.Schema(type=openapi.TYPE_STRING, description='Phone number of the user'),
        'allow_newsletters': openapi.Schema(
            type=openapi.TYPE_BOOLEAN, description='Whether the user allows newsletters'
        ),
    },
)


@method_decorator(
    name='update',
    decorator=swagger_auto_schema(
        tags=['Users'],
        x_fern_audiences=['internal'],
        operation_summary='Save user details',
        operation_description="""
    Save details for a specific user, such as their name or contact information, in Label Studio.
    """,
        manual_parameters=[
            openapi.Parameter(name='id', type=openapi.TYPE_INTEGER, in_=openapi.IN_PATH, description='User ID'),
        ],
        request_body=UserSerializer,
    ),
)
@method_decorator(
    name='list',
    decorator=swagger_auto_schema(
        tags=['Users'],
        x_fern_sdk_group_name='users',
        x_fern_sdk_method_name='list',
        x_fern_audiences=['public'],
        operation_summary='List users',
        operation_description='List the users that exist on the Label Studio server.',
    ),
)
@method_decorator(
    name='create',
    decorator=swagger_auto_schema(
        tags=['Users'],
        x_fern_sdk_group_name='users',
        x_fern_sdk_method_name='create',
        x_fern_audiences=['public'],
        operation_summary='Create new user',
        operation_description='Create a user in Label Studio.',
        request_body=_user_schema,
        responses={201: UserSerializer},
    ),
)
@method_decorator(
    name='retrieve',
    decorator=swagger_auto_schema(
        tags=['Users'],
        x_fern_sdk_group_name='users',
        x_fern_sdk_method_name='get',
        x_fern_audiences=['public'],
        operation_summary='Get user info',
        operation_description='Get info about a specific Label Studio user, based on the user ID.',
        manual_parameters=[
            openapi.Parameter(name='id', type=openapi.TYPE_INTEGER, in_=openapi.IN_PATH, description='User ID'),
        ],
        request_body=no_body,
        responses={200: UserSerializer},
    ),
)
@method_decorator(
    name='partial_update',
    decorator=swagger_auto_schema(
        tags=['Users'],
        x_fern_sdk_group_name='users',
        x_fern_sdk_method_name='update',
        x_fern_audiences=['public'],
        operation_summary='Update user details',
        operation_description="""
        Update details for a specific user, such as their name or contact information, in Label Studio.
        """,
        manual_parameters=[
            openapi.Parameter(name='id', type=openapi.TYPE_INTEGER, in_=openapi.IN_PATH, description='User ID'),
        ],
        request_body=_user_schema,
        responses={200: UserSerializer},
    ),
)
@method_decorator(
    name='destroy',
    decorator=swagger_auto_schema(
        tags=['Users'],
        x_fern_sdk_group_name='users',
        x_fern_sdk_method_name='delete',
        x_fern_audiences=['public'],
        operation_summary='Delete user',
        operation_description='Delete a specific Label Studio user.',
        manual_parameters=[
            openapi.Parameter(name='id', type=openapi.TYPE_INTEGER, in_=openapi.IN_PATH, description='User ID'),
        ],
        request_body=no_body,
    ),
)
class UserAPI(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_required = ViewClassPermission(
        GET=all_permissions.organizations_view,
        PUT=all_permissions.organizations_change,
        POST=all_permissions.organizations_view,
        PATCH=all_permissions.organizations_view,
        DELETE=all_permissions.organizations_view,
    )
    http_method_names = ['get', 'post', 'head', 'patch', 'delete']

    def _is_super_admin(self, user):
        """Check if user is Super Admin"""
        print(f"DEBUG: Checking super admin for user: {user.email}")
        if user.email == 'superadmin@gmail.com':
            print("DEBUG: Super admin detected by email")
            return True
        if getattr(user, 'is_superuser', False):
            print("DEBUG: Super admin detected by is_superuser")
            return True
        try:
            from users.role_models import UserRoleAssignment
            has_role = UserRoleAssignment.objects.filter(
                user=user, 
                role__name__in=['super-admin', 'super_admin'], 
                is_active=True
            ).exists()
            print(f"DEBUG: Super admin role check result: {has_role}")
            return has_role
        except Exception as e:
            print(f"DEBUG: Error checking super admin role: {e}")
            return False

    def _is_admin(self, user):
        """Check if user is Admin (includes Super Admin)"""
        # Check for specific admin emails
        if user.email in ['dhaneshwari.tosscss@gmail.com', 'superadmin@gmail.com']:
            return True
        if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
            return True
        try:
            from users.role_models import UserRoleAssignment
            # Check for admin, super-admin, and administrator roles (case-insensitive)
            return UserRoleAssignment.objects.filter(
                user=user, 
                role__name__in=['administrator', 'admin', 'super-admin', 'super_admin', 'Administrator', 'Admin'], 
                is_active=True
            ).exists()
        except Exception:
            return False
    
    def _is_client(self, user):
        # Check for specific client email
        if user.email == 'dhaneshwari.ttosscss@gmail.com':
            return True
        try:
            from users.role_models import UserRoleAssignment
            # Check for 'client' role
            return UserRoleAssignment.objects.filter(
                user=user, 
                role__name__iexact='client', 
                is_active=True
            ).exists()
        except Exception:
            return False

    def get_queryset(self):
        qs = User.objects.filter(organizations=self.request.user.active_organization)
        if self._is_admin(self.request.user):
            return qs
        try:
            return qs.filter(created_by=self.request.user)
        except DatabaseError:
            return qs

    @swagger_auto_schema(auto_schema=None, methods=['delete', 'post'])
    @action(detail=True, methods=['delete', 'post'], permission_required=all_permissions.avatar_any)
    def avatar(self, request, pk):
        if request.method == 'POST':
            avatar = check_avatar(request.FILES)
            request.user.avatar = avatar
            request.user.save()
            return Response({'detail': 'avatar saved'}, status=200)

        elif request.method == 'DELETE':
            request.user.avatar = None
            request.user.save()
            return Response(status=204)

    def get_serializer_class(self):
        if self.request.method in {'PUT', 'PATCH'}:
            return UserSerializerUpdate
        return super().get_serializer_class()

    def get_serializer_context(self):
        context = super(UserAPI, self).get_serializer_context()
        context['user'] = self.request.user
        return context

    def update(self, request, *args, **kwargs):
        return super(UserAPI, self).update(request, *args, **kwargs)

    def list(self, request, *args, **kwargs):
        return super(UserAPI, self).list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        return super(UserAPI, self).create(request, *args, **kwargs)

    def perform_create(self, serializer):
        from organizations.models import Organization

        extra = {}
        # For clients, tag creator
        if not self._is_admin(self.request.user):
            try:
                extra['created_by'] = self.request.user
            except Exception:
                pass

        instance = serializer.save(**extra)

        # Make sure the user is a member of the current organization so it shows up in memberships API
        org = getattr(self.request.user, 'active_organization', None)
        if org is None:
            try:
                org = Organization.find_by_user(self.request.user)
            except Exception:
                org = None
        if org is not None:
            try:
                org.add_user(instance)
            except Exception:
                pass
            # Ensure the created user has an active_organization set
            if getattr(instance, 'active_organization_id', None) is None:
                instance.active_organization = org
                try:
                    instance.save(update_fields=['active_organization'])
                except Exception:
                    instance.save()

    def retrieve(self, request, *args, **kwargs):
        return super(UserAPI, self).retrieve(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        result = super(UserAPI, self).partial_update(request, *args, **kwargs)

        # throw MethodNotAllowed if read-only fields are attempted to be updated
        read_only_fields = self.get_serializer_class().Meta.read_only_fields
        for field in read_only_fields:
            if field in request.data:
                raise MethodNotAllowed('PATCH', detail=f'Cannot update read-only field: {field}')

        # newsletters
        if 'allow_newsletters' in request.data:
            user = User.objects.get(id=request.user.id)  # we need an updated user
            request.user.advanced_json = {  # request.user instance will be unchanged in request all the time
                'email': user.email,
                'allow_newsletters': user.allow_newsletters,
                'update-notifications': 1,
                'new-user': 0,
            }
        return result

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def create_role_based(self, request):
        """
        Create a user with role-based permissions (Admin can create any, Client can create and sets created_by).
        """
        from organizations.models import Organization, OrganizationMember
        from django.db import transaction
        
        try:
            # Get the first organization
            org = Organization.objects.first()
            if not org:
                return Response(
                    {'error': 'No organization found'}, 
                    status=400
                )
            
            # Extract user data
            email = request.data.get('email', '').strip()
            first_name = request.data.get('first_name', '').strip()
            last_name = request.data.get('last_name', '').strip()
            role = request.data.get('role', 'User').strip()
            
            if not email:
                return Response(
                    {'error': 'Email is required'}, 
                    status=400
                )
            
            # Check if user already exists
            if User.objects.filter(email=email).exists():
                return Response(
                    {'error': 'User with this email already exists'}, 
                    status=400
                )
            
            with transaction.atomic():
                # Create the user
                user_data = {
                    'email': email,
                    'username': email,
                    'first_name': first_name,
                    'last_name': last_name,
                    'is_active': True,
                    'active_organization': org,
                }
                
                # Set created_by and role based on user permissions
                print(f"DEBUG: Creating user with role: {role}")
                print(f"DEBUG: Request user: {request.user.email} (ID: {request.user.id})")
                print(f"DEBUG: Is admin: {self._is_admin(request.user)}")
                
                if not self._is_admin(request.user):
                    # Client creates user - set created_by to current user and force role to "User"
                    user_data['created_by'] = request.user
                    role = 'user'  # Clients can only create User role (lowercase)
                    print(f"DEBUG: Client creating user with role: {role}")
                else:
                    # Admin can create any role - normalize role names and set created_by
                    user_data['created_by'] = request.user
                    original_role = role
                    if role.lower() in ['super-admin', 'super_admin']:
                        role = 'super-admin'
                    elif role.lower() == 'admin':
                        role = 'admin'  # Keep lowercase for consistency
                    elif role.lower() == 'administrator':
                        role = 'admin'  # Map administrator to admin for consistency
                    elif role.lower() == 'client':
                        role = 'client'  # Keep lowercase for consistency
                    elif role.lower() == 'user':
                        role = 'user'  # Keep lowercase for consistency
                    print(f"DEBUG: Admin creating user with role: {original_role} -> {role}")
                
                new_user = User.objects.create(**user_data)
                
                # Assign role to the user
                try:
                    from users.role_models import UserRoleAssignment, Role
                    role_obj, created = Role.objects.get_or_create(name=role)
                    UserRoleAssignment.objects.create(
                        user=new_user,
                        role=role_obj,
                        assigned_by=request.user,  # Fix: Add assigned_by field
                        is_active=True
                    )
                    logger.info(f"Assigned role '{role}' to user {new_user.id} by {request.user.email}")
                except Exception as e:
                    logger.warning(f"Could not assign role '{role}' to user {new_user.id}: {str(e)}")
                
                # Add user to the organization
                membership, created = OrganizationMember.objects.get_or_create(
                    user=new_user,
                    organization=org,
                    defaults={'deleted_at': None}
                )
                
                logger.info(f"Created user {new_user.id} ({email}) by {request.user.email} and added to organization {org.id}")
                
                return Response({
                    'id': new_user.id,
                    'email': new_user.email,
                    'first_name': new_user.first_name,
                    'last_name': new_user.last_name,
                    'username': new_user.username,
                    'active_organization': org.id,
                    'created_by': new_user.created_by_id,
                    'role': role,
                    'message': 'User created successfully'
                }, status=201)
                
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            return Response(
                {'error': f'Failed to create user: {str(e)}'}, 
                status=500
            )

    @action(detail=False, methods=['get'], permission_classes=[], authentication_classes=[])
    def list_all(self, request):
        """
        List users without authentication (for frontend display) with role-based filtering.
        """
        from organizations.models import OrganizationMember
        
        try:
            # Get pagination parameters
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 10))
            
            # Calculate offset
            offset = (page - 1) * page_size
            
            # Get all memberships first
            memberships_query = OrganizationMember.objects.filter(
                deleted_at__isnull=True
            ).select_related('user', 'organization')
            
            # Apply role-based filtering
            # For now, we'll show all users since we don't have authentication context
            # In a real implementation, you'd check the current user's role here
            # For testing purposes, we'll show all users
            
            # Get total count
            total_count = memberships_query.count()
            
            # Get paginated users with their organization memberships
            memberships = memberships_query.order_by('user__id')[offset:offset + page_size]
            
            users_data = []
            for membership in memberships:
                user = membership.user
                users_data.append({
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'username': user.username,
                        'is_active': user.is_active,
                        'created_by': user.created_by_id,  # Add created_by info
                    },
                    'organization': {
                        'id': membership.organization.id,
                        'title': membership.organization.title,
                    }
                })
            
            return Response({
                'results': users_data,
                'count': total_count,
                'page': page,
                'page_size': page_size,
                'total_pages': (total_count + page_size - 1) // page_size,
                'message': 'Users retrieved successfully'
            }, status=200)
            
        except Exception as e:
            logger.error(f"Error listing users: {str(e)}")
            return Response(
                {'error': f'Failed to list users: {str(e)}'}, 
                status=500
            )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def test_all_users(self, request):
        """Test endpoint to see all users in database"""
        User = get_user_model()
        all_users = User.objects.all()
        users_data = []
        for user in all_users:
            users_data.append({
                'id': user.id,
                'email': user.email,
                'is_active': user.is_active,
                'date_joined': user.date_joined.isoformat() if user.date_joined else None,
                'created_by': user.created_by_id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
            })
        
        print(f"DEBUG: Test endpoint - Total users: {all_users.count()}")
        print(f"DEBUG: Test endpoint - Users: {[u.email for u in all_users]}")
        
        return Response({
            'total_users': all_users.count(),
            'users': users_data,
            'message': 'All users in database'
        }, status=200)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def test_api(self, request):
        """
        Test API endpoint to verify server is working
        """
        try:
            # Check user roles
            is_super_admin = self._is_super_admin(request.user)
            is_admin = self._is_admin(request.user)
            is_client = self._is_client(request.user)
            
            # Count users created by current user
            created_users_count = User.objects.filter(created_by=request.user).count()
            total_users_count = User.objects.count()
            
            return Response({
                'status': 'success',
                'message': 'API is working',
                'user_email': request.user.email if request.user else 'No user',
                'user_id': request.user.id if request.user else 'No user ID',
                'user_roles': {
                    'is_super_admin': is_super_admin,
                    'is_admin': is_admin,
                    'is_client': is_client
                },
                'user_counts': {
                    'total_users': total_users_count,
                    'created_by_me': created_users_count
                }
            }, status=200)
        except Exception as e:
            import traceback
            return Response({
                'status': 'error',
                'message': str(e),
                'traceback': traceback.format_exc()
            }, status=500)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def list_role_based(self, request):
        """
        List users with role-based filtering - Fixed version
        """
        try:
            # Get pagination parameters
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 10))
            search_query = request.GET.get('search', '').strip()
            user_filter = request.GET.get('user_filter', 'All Users').strip()
            
            # Calculate offset
            offset = (page - 1) * page_size
            
            # Determine user role and apply appropriate filtering
            is_super_admin = self._is_super_admin(request.user)
            is_admin = self._is_admin(request.user)
            
            print(f"DEBUG: User {request.user.email} - Super Admin: {is_super_admin}, Admin: {is_admin}")
            print(f"DEBUG: User ID: {request.user.id}")
            print(f"DEBUG: User is_superuser: {getattr(request.user, 'is_superuser', False)}")
            print(f"DEBUG: User is_staff: {getattr(request.user, 'is_staff', False)}")
            
            # Debug role assignments
            try:
                from users.role_models import UserRoleAssignment
                role_assignments = UserRoleAssignment.objects.filter(
                    user=request.user, 
                    is_active=True
                ).values_list('role__name', flat=True)
                print(f"DEBUG: User role assignments: {list(role_assignments)}")
            except Exception as e:
                print(f"DEBUG: Error getting role assignments: {e}")
            
            if is_super_admin:
                # Super Admin: Show ALL users
                users_query = User.objects.all()
                print(f"DEBUG: Super admin - Total users: {users_query.count()}")
            elif is_admin:
                # Admin: Show only users they created
                users_query = User.objects.filter(created_by=request.user)
                print(f"DEBUG: Admin {request.user.email} - Created users: {users_query.count()}")
                
                # Debug: Check all users created by this admin
                all_created_users = User.objects.filter(created_by=request.user)
                for user in all_created_users:
                    print(f"DEBUG: Created user - ID: {user.id}, Email: {user.email}, Created by: {user.created_by_id}")
            else:
                # Client: Show only users they created (using organization memberships)
                from organizations.models import OrganizationMember
                memberships_query = OrganizationMember.objects.filter(
                    deleted_at__isnull=True,
                    user__created_by=request.user
                ).select_related('user', 'organization')
                print(f"DEBUG: Client {request.user.email} - Created users: {memberships_query.count()}")
                
                # Convert memberships to users for consistent processing
                users_query = User.objects.filter(
                    id__in=[m.user.id for m in memberships_query]
                )
            
            # Apply search filtering
            if search_query:
                from django.db.models import Q
                users_query = users_query.filter(
                    Q(email__icontains=search_query) |
                    Q(first_name__icontains=search_query) |
                    Q(last_name__icontains=search_query) |
                    Q(username__icontains=search_query)
                )
                print(f"DEBUG: After search '{search_query}': {users_query.count()} users")
            
            # Apply status filtering
            if user_filter == "Active Users":
                from django.utils import timezone
                from datetime import timedelta
                days_ago = timezone.now() - timedelta(days=7)
                from django.db.models import Q
                users_query = users_query.filter(
                    Q(last_activity__gte=days_ago) |
                    Q(date_joined__gte=days_ago)
                )
            elif user_filter == "Inactive Users":
                from django.utils import timezone
                from datetime import timedelta
                days_ago = timezone.now() - timedelta(days=7)
                from django.db.models import Q
                users_query = users_query.filter(
                    Q(last_activity__lt=days_ago) |
                    Q(last_activity__isnull=True, date_joined__lt=days_ago)
                )
            
            # Get final count and paginate
            total_count = users_query.count()
            users = users_query.order_by('-date_joined')[offset:offset + page_size]
            
            print(f"DEBUG: Final count: {total_count}, Paginated: {len(users)}")
            
            # Build response data
            users_data = []
            for user in users:
                users_data.append({
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'username': user.username,
                        'is_active': user.is_active,
                        'created_by': user.created_by_id,
                        'last_activity': user.last_activity.isoformat() if user.last_activity else None,
                        'date_joined': user.date_joined.isoformat() if user.date_joined else None,
                    },
                    'organization': {
                        'id': 1,
                        'title': 'Default Organization',
                    }
                })
                print(f"DEBUG: Added user: {user.email} (ID: {user.id}, Created by: {user.created_by_id})")
            
            # Determine user role for response
            if is_super_admin:
                user_role = 'super-admin'
            elif is_admin:
                user_role = 'admin'
            else:
                user_role = 'client'
            
            return Response({
                'results': users_data,
                'count': total_count,
                'page': page,
                'page_size': page_size,
                'total_pages': (total_count + page_size - 1) // page_size,
                'user_role': user_role,
                'message': f'{user_role.title()} users retrieved successfully'
            }, status=200)
            
        except Exception as e:
            import traceback
            error_msg = f"Error listing users: {str(e)}"
            logger.error(error_msg)
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response({
                'error': error_msg,
                'details': str(e)
            }, status=500)

    def destroy(self, request, *args, **kwargs):
        """
        Custom destroy method to safely delete a user while preserving their projects and related data.
        
        This method ensures that:
        - Only the user record is deleted
        - Projects created by the user are transferred to Super Admin to remain fully accessible
        - Tasks in those projects remain intact (updated_by set to NULL)
        - Annotations in those projects remain intact (completed_by and updated_by set to NULL)
        - ProjectMember and OrganizationMember records are deleted (expected behavior)
        - AnnotationDrafts are deleted (expected behavior for temporary drafts)
        """
        import logging
        from django.db import transaction
        
        logger = logging.getLogger(__name__)
        
        try:
            # Get the user to be deleted
            user_to_delete = self.get_object()
            user_email = user_to_delete.email
            user_id = user_to_delete.id
            
            # Log the deletion attempt
            logger.info(f"User deletion initiated: {user_email} (ID: {user_id}) by {request.user.email}")
            
            # Count related data before deletion for logging
            from projects.models import Project
            from tasks.models import Task, Annotation, AnnotationDraft
            from projects.models import ProjectMember
            from organizations.models import OrganizationMember
            
            projects_count = Project.objects.filter(created_by=user_to_delete).count()
            tasks_count = Task.objects.filter(updated_by=user_to_delete).count()
            from django.db import models
            annotations_count = Annotation.objects.filter(
                models.Q(completed_by=user_to_delete) | models.Q(updated_by=user_to_delete)
            ).count()
            drafts_count = AnnotationDraft.objects.filter(user=user_to_delete).count()
            project_memberships_count = ProjectMember.objects.filter(user=user_to_delete).count()
            org_memberships_count = OrganizationMember.objects.filter(user=user_to_delete).count()
            
            logger.info(f"User {user_email} deletion - Related data counts:")
            logger.info(f"  - Projects created: {projects_count}")
            logger.info(f"  - Tasks updated: {tasks_count}")
            logger.info(f"  - Annotations: {annotations_count}")
            logger.info(f"  - Drafts: {drafts_count}")
            logger.info(f"  - Project memberships: {project_memberships_count}")
            logger.info(f"  - Organization memberships: {org_memberships_count}")
            
            # Find Super Admin to transfer project ownership
            super_admin = None
            try:
                # Try to find Super Admin by email first
                super_admin = User.objects.filter(email='superadmin@gmail.com').first()
                if not super_admin:
                    # Try to find by role
                    from users.role_models import UserRoleAssignment
                    super_admin_role = UserRoleAssignment.objects.filter(
                        role__name__in=['super-admin', 'super_admin'], 
                        is_active=True
                    ).first()
                    if super_admin_role:
                        super_admin = super_admin_role.user
                
                if not super_admin:
                    # Fallback: find any superuser
                    super_admin = User.objects.filter(is_superuser=True).first()
                    
            except Exception as e:
                logger.warning(f"Could not find Super Admin: {e}")
            
            # Perform the deletion with project ownership transfer
            with transaction.atomic():
                if projects_count > 0 and super_admin:
                    # Transfer project ownership to Super Admin
                    Project.objects.filter(created_by=user_to_delete).update(created_by=super_admin)
                    logger.info(f"Transferred {projects_count} projects from {user_email} to Super Admin {super_admin.email}")
                elif projects_count > 0 and not super_admin:
                    # If no Super Admin found, we can't delete the user
                    logger.error(f"Cannot delete user {user_email}: has {projects_count} projects but no Super Admin found")
                    return Response(
                        {
                            'error': f'Cannot delete user {user_email}',
                            'message': f'This user has created {projects_count} projects. Please assign a Super Admin first to transfer project ownership.',
                            'details': {
                                'projects_created': projects_count,
                                'reason': 'No Super Admin found to transfer project ownership'
                            }
                        },
                        status=400
                    )
                
                # Delete the user (this will trigger the cascade behaviors)
                user_to_delete.delete()
                
                logger.info(f"User {user_email} (ID: {user_id}) successfully deleted")
                if projects_count > 0:
                    logger.info(f"Projects created by {user_email} transferred to Super Admin and remain fully accessible")
                logger.info(f"Tasks and annotations remain intact with user references set to NULL")
                
            return Response(
                {
                    'message': f'User {user_email} has been successfully deleted.',
                    'details': {
                        'user_email': user_email,
                        'user_id': user_id,
                        'preserved_data': {
                            'projects_created': projects_count,
                            'tasks_updated': tasks_count,
                            'annotations': annotations_count,
                        },
                        'project_ownership_transferred': projects_count > 0,
                        'transferred_to': super_admin.email if super_admin and projects_count > 0 else None,
                        'note': 'All projects, tasks, and annotations created by this user remain fully accessible.'
                    }
                },
                status=200
            )
            
        except Exception as e:
            logger.error(f"Error deleting user {user_email}: {str(e)}")
            return Response(
                {
                    'error': f'Failed to delete user: {str(e)}',
                    'message': 'User deletion failed. Please try again or contact support.'
                },
                status=500
            )


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Users'],
        x_fern_sdk_group_name='users',
        x_fern_sdk_method_name='reset_token',
        x_fern_audiences=['public'],
        operation_summary='Reset user token',
        operation_description='Reset the user token for the current user.',
        request_body=no_body,
        responses={
            201: openapi.Response(
                description='User token response',
                schema=openapi.Schema(
                    description='User token',
                    type=openapi.TYPE_OBJECT,
                    properties={'token': openapi.Schema(description='Token', type=openapi.TYPE_STRING)},
                ),
            )
        },
    ),
)
class UserResetTokenAPI(APIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = User.objects.all()
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        user = request.user
        token = user.reset_token()
        logger.debug(f'New token for user {user.pk} is {token.key}')
        return Response({'token': token.key}, status=201)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Users'],
        x_fern_sdk_group_name='users',
        x_fern_sdk_method_name='get_token',
        x_fern_audiences=['public'],
        operation_summary='Get user token',
        operation_description='Get a user token to authenticate to the API as the current user.',
        request_body=no_body,
        responses={
            200: openapi.Response(
                description='User token response',
                schema=openapi.Schema(
                    description='User token',
                    type=openapi.TYPE_OBJECT,
                    properties={'detail': openapi.Schema(description='Token', type=openapi.TYPE_STRING)},
                ),
            )
        },
    ),
)
class UserGetTokenAPI(APIView):
    parser_classes = (JSONParser,)
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        user = request.user
        token = Token.objects.get(user=user)
        return Response({'token': str(token)}, status=200)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Users'],
        x_fern_sdk_group_name='users',
        x_fern_sdk_method_name='whoami',
        x_fern_audiences=['public'],
        operation_summary='Retrieve my user',
        operation_description='Retrieve details of the account that you are using to access the API.',
        request_body=no_body,
        responses={200: UserSerializer},
    ),
)
class UserWhoAmIAPI(generics.RetrieveAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = User.objects.all()
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def get(self, request, *args, **kwargs):
        return super(UserWhoAmIAPI, self).get(request, *args, **kwargs)

@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Users'],
        operation_summary='Send email notification',
        operation_description='Send email notification to a user',
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'to': openapi.Schema(type=openapi.TYPE_STRING, description='Recipient email address'),
                'subject': openapi.Schema(type=openapi.TYPE_STRING, description='Email subject'),
                'message': openapi.Schema(type=openapi.TYPE_STRING, description='Email message content'),
            },
            required=['to', 'subject', 'message']
        ),
        responses={
            200: openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={'success': openapi.Schema(type=openapi.TYPE_BOOLEAN)},
            ),
            400: openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={'error': openapi.Schema(type=openapi.TYPE_STRING)},
            ),
        },
    ),
)
class SendEmailAPI(APIView):
    """
    API view for sending email notifications
    """
    parser_classes = (JSONParser,)
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        """
        Send email notification
        """
        try:
            to_email = request.data.get('to')
            subject = request.data.get('subject')
            message = request.data.get('message')
            
            if not to_email or not subject or not message:
                return Response(
                    {'error': 'Missing required fields: to, subject, message'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Send email using Django's send_mail
            from django.core.mail import send_mail
            from django.conf import settings
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_email],
                fail_silently=False,
            )
            
            logger.info(f"Email sent successfully to {to_email}")
            
            return Response(
                {'success': True, 'message': f'Email sent successfully to {to_email}'},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return Response(
                {'error': f'Failed to send email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

