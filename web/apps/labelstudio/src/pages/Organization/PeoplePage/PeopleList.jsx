import { formatDistance } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { Userpic } from "@humansignal/ui";
import { Pagination } from "../../../components";
import { usePage, usePageSize } from "../../../components/Pagination/Pagination";
import { useAPI } from "../../../providers/ApiProvider";
import { useCurrentUser } from "../../../providers/CurrentUser";
import { useUserRoles } from "../../../hooks/useUserRoles";
import { Block, Elem } from "../../../utils/bem";
// isDefined import removed - no longer needed
import "./PeopleList.scss";
import { CopyableTooltip } from "../../../components/CopyableTooltip/CopyableTooltip";

export const PeopleList = () => {
  const api = useAPI();
  const { user } = useCurrentUser();
  const { hasRole } = useUserRoles();
  const [usersList, setUsersList] = useState();
  const [currentPage] = usePage("page", 1);
  const [currentPageSize] = usePageSize("page_size", 100);
  const [totalItems, setTotalItems] = useState(0);

  // Determine user role
  const isAdmin = hasRole('admin') || user?.email === 'dhaneshwari.tosscss@gmail.com';
  const isClient = hasRole('client') || user?.email === 'dhaneshwari.ttosscss@gmail.com';

  console.log('DEBUG: Current user:', user?.email);
  console.log('DEBUG: isAdmin:', isAdmin);
  console.log('DEBUG: isClient:', isClient);
  console.log('DEBUG: hasRole("admin"):', hasRole('admin'));
  console.log('DEBUG: hasRole("client"):', hasRole('client'));
  console.log({ currentPage, currentPageSize });

  // Debug function to test user fetching
  window.debugOrganizationUsers = () => {
    console.log("=== DEBUG: Organization Users ===");
    console.log("Current users list:", usersList);
    console.log("Users count:", usersList?.length || 0);
    console.log("Total items:", totalItems);
    console.log("Current user:", user);
    console.log("User roles:", { isAdmin, isClient });
    console.log("Page info:", { currentPage, currentPageSize });
    
    // Test fetch with different parameters
    console.log("Testing fetch with page_size 1000...");
    fetchUsers(1, 1000);
  };

  const fetchUsers = useCallback(async (page, pageSize) => {
    console.log('=== Organization Page: Starting user fetch ===');
    console.log('Page:', page, 'PageSize:', pageSize);
    console.log('Current user:', user?.email);
    console.log('User roles - isAdmin:', isAdmin, 'isClient:', isClient);
    
    try {
      // Try multiple approaches to get more users
      let response;
      
      // First try: Use the same API as Manage Users page for Super Admin
      const isSuperAdmin = hasRole('super-admin') || user?.email === 'superadmin@gmail.com';
      
      if (isSuperAdmin) {
        console.log('Super Admin detected - trying direct API call...');
        try {
          const baseUrl = window.location.origin;
          const queryParams = new URLSearchParams({
            page: '1',
            page_size: '1000',
            search: '',
            user_filter: 'All Users'
          });
          
          const apiUrl = `${baseUrl}/api/users/list_role_based/?${queryParams}`;
          console.log('Direct API URL:', apiUrl);
          
          const apiResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            credentials: 'include',
          });
          
          if (apiResponse.ok) {
            response = await apiResponse.json();
            console.log('Direct API response:', response);
          } else {
            console.log('Direct API failed, falling back to memberships API');
            throw new Error('Direct API failed');
          }
        } catch (directApiError) {
          console.log('Direct API error:', directApiError);
          // Fallback to memberships API
          response = await api.callApi("memberships", {
            params: {
              pk: 1,
              contributed_to_projects: 1,
              page: page || 1,
              page_size: 1000,
            },
            include: [
              "id",
              "email", 
              "first_name",
              "last_name",
              "username",
              "created_by",
              "is_active"
            ],
          });
        }
      } else {
        // Regular users: Use memberships API with increased page size
        response = await api.callApi("memberships", {
          params: {
            pk: 1,
            contributed_to_projects: 1,
            page: page || 1,
            page_size: 1000, // Increased from pageSize to get more users
          },
          include: [
            "id",
            "email", 
            "first_name",
            "last_name",
            "username",
            "created_by",
            "is_active"
          ],
        });
      }

      console.log('API Response:', response);
      console.log('Response results:', response?.results);
      console.log('Results count:', response?.results?.length);

      if (response.results) {
        let filteredResults = response.results;
        
        console.log('DEBUG: Total users fetched:', response.results.length);
        console.log('DEBUG: Current user ID:', user?.id);
        
        // Filter users based on role
        if (isClient) {
          console.log('DEBUG: Filtering for client user');
          // Client sees users they created (including themselves)
          filteredResults = response.results.filter(({ user: userData }) => {
            const isCreatedByClient = userData.created_by === user?.id;
            const isClientSelf = userData.id === user?.id;
            console.log(`DEBUG: User ${userData.email}: created_by=${userData.created_by}, current_user_id=${user?.id}, isCreatedByClient=${isCreatedByClient}, isClientSelf=${isClientSelf}`);
            return isCreatedByClient || isClientSelf;
          });
          console.log('DEBUG: Filtered users count:', filteredResults.length);
        } else {
          console.log('DEBUG: Admin user - showing all users');
        }
        // Admin sees all users (no additional filtering needed)
        
        console.log('Setting users list with:', filteredResults.length, 'users');
        setUsersList(filteredResults);
        setTotalItems(filteredResults.length);
      } else {
        console.warn('No results in API response');
        setUsersList([]);
        setTotalItems(0);
      }
    } catch (error) {
      console.error('Error fetching users in Organization page:', error);
      setUsersList([]);
      setTotalItems(0);
    }
    
    console.log('=== Organization Page: User fetch completed ===');
  }, [isClient, user?.id, api, isAdmin]);

  // User selection removed - no longer needed

  useEffect(() => {
    fetchUsers(currentPage, currentPageSize);
  }, [fetchUsers, currentPage, currentPageSize]);

  // Default selection useEffect removed - no longer needed

  return (
    <>
      <Block name="people-list">
        <Elem name="wrapper">
          {usersList ? (
            <Elem name="users">
              <Elem name="header">
                <Elem name="title">People</Elem>
                <Elem name="search-container">
                  <Elem name="search-input" placeholder="Search People..." />
                </Elem>
                {/* Filters and CSV file button removed */}
              </Elem>
              <Elem name="user-cards">
                {usersList.map(({ user }) => {
                  return (
                    <Elem key={`user-${user.id}`} name="user-card">
                      <Elem name="user-info">
                        <Elem name="avatar">
                          <CopyableTooltip title={`User ID: ${user.id}`} textForCopy={user.id}>
                            <Userpic user={user} style={{ width: 40, height: 40 }} />
                          </CopyableTooltip>
                        </Elem>
                        <Elem name="details">
                          <Elem name="email">{user.email}</Elem>
                          <Elem name="activity">
                            {formatDistance(new Date(user.last_activity), new Date(), { addSuffix: true })}
                            <Elem name="status-dot" />
                          </Elem>
                        </Elem>
                      </Elem>
                      {/* View Profile button removed */}
                    </Elem>
                  );
                })}
              </Elem>
            </Elem>
          ) : (
            <Elem name="loading">
            </Elem>
          )}
        </Elem>
        <Pagination
          page={currentPage}
          urlParamName="page"
          totalItems={totalItems}
          pageSize={currentPageSize}
          pageSizeOptions={[100, 200, 500]}
          onPageLoad={fetchUsers}
          style={{ paddingTop: 16 }}
        />
      </Block>
    </>
  );
};
