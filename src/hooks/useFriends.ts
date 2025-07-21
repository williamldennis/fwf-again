import { useEffect, useState, useCallback } from 'react';
import { ContactsService, Friend, Contact } from '../services/contactsService';
import { logMessage, logError, addBreadcrumb } from '../utils/sentry';

export interface UseFriendsResult {
  friends: Friend[];
  refreshFriends: () => Promise<void>;
  refreshContacts: () => Promise<{ success: boolean; contactCount: number; error?: string }>;
  loading: boolean;
  error: string | null;
}

export function useFriends(userId: string | null): UseFriendsResult {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch friends data
  const fetchFriendsData = useCallback(async (userId: string) => {
    console.log("[Friends] 👥 Starting friends fetch...");
    logMessage("Starting friends fetch", "info", { userId });
    addBreadcrumb("Friends fetch started", "friends", { userId });
    
    try {
      // Fetch user's contacts and find friends
      console.log("[Friends] 📞 Fetching user's contacts...");
      logMessage("Fetching user contacts", "info", { userId });
      
      const allContacts = await ContactsService.fetchUserContacts(userId);
      console.log(`[Friends] ✅ Total contacts retrieved: ${allContacts.length}`);
      logMessage("Contacts retrieved", "info", { 
        userId, 
        contactCount: allContacts.length,
        contactPhones: allContacts.slice(0, 5).map(c => c.contact_phone) // Log first 5 for debugging
      });

      console.log("[Friends] 🔍 Processing contacts and finding friends...");
      logMessage("Processing contacts to find friends", "info", { userId, contactCount: allContacts.length });
      
      const friendsWithNamesAndCities = await ContactsService.findFriendsFromContacts(
        allContacts,
        userId
      );
      console.log(`[Friends] ✅ Friends with cities loaded: ${friendsWithNamesAndCities.length}`);
      logMessage("Friends found", "info", { 
        userId, 
        friendsCount: friendsWithNamesAndCities.length,
        friendIds: friendsWithNamesAndCities.map(f => f.id),
        friendNames: friendsWithNamesAndCities.map(f => f.contact_name)
      });

      setFriends(friendsWithNamesAndCities);
      console.log("[Friends] ✅ Friends data loaded successfully");
      addBreadcrumb("Friends data loaded", "friends", { 
        userId, 
        friendsCount: friendsWithNamesAndCities.length 
      });
    } catch (err) {
      console.error("[Friends] ❌ Friends fetch error:", err);
      logError(err as Error, { 
        userId, 
        operation: "fetchFriendsData",
        errorType: "friends_fetch_error"
      });
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to fetch friends: ${errorMessage}`);
      // Don't throw - friends failure shouldn't break the app
    }
  }, []);

  // Refresh friends data
  const refreshFriends = useCallback(async (): Promise<void> => {
    if (!userId) return;
    
    console.log("[Friends] 🔄 Refreshing friends data...");
    logMessage("Refreshing friends data", "info", { userId });
    addBreadcrumb("Friends refresh started", "friends", { userId });
    
    setLoading(true);
    setError(null);

    try {
      await fetchFriendsData(userId);
      console.log("[Friends] ✅ Friends refresh completed!");
      logMessage("Friends refresh completed", "info", { userId });
    } catch (err) {
      console.error("[Friends] ❌ Friends refresh error:", err);
      logError(err as Error, { 
        userId, 
        operation: "refreshFriends",
        errorType: "friends_refresh_error"
      });
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Friends refresh failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [userId, fetchFriendsData]);

  // Refresh contacts from device
  const refreshContacts = useCallback(async (): Promise<{ success: boolean; contactCount: number; error?: string }> => {
    if (!userId) {
      logMessage("No user ID for contacts refresh", "warning", { userId });
      return { success: false, contactCount: 0, error: "No user ID provided" };
    }

    console.log("[Friends] 📱 Refreshing contacts from device...");
    logMessage("Refreshing contacts from device", "info", { userId });
    addBreadcrumb("Contacts refresh started", "contacts", { userId });
    
    try {
      const result = await ContactsService.refreshContacts();
      
      if (result.success) {
        console.log(`[Friends] ✅ Contacts refreshed: ${result.contactCount} contacts`);
        logMessage("Contacts refreshed successfully", "info", { 
          userId, 
          contactCount: result.contactCount 
        });
        // Refresh friends data after contacts are updated
        await refreshFriends();
      } else {
        console.error("[Friends] ❌ Contacts refresh failed:", result.error);
        logMessage("Contacts refresh failed", "error", { 
          userId, 
          error: result.error 
        });
      }
      
      return result;
    } catch (err) {
      console.error("[Friends] ❌ Contacts refresh error:", err);
      logError(err as Error, { 
        userId, 
        operation: "refreshContacts",
        errorType: "contacts_refresh_error"
      });
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return { success: false, contactCount: 0, error: errorMessage };
    }
  }, [userId, refreshFriends]);

  // Initial friends fetch
  useEffect(() => {
    if (!userId) {
      setFriends([]);
      setLoading(false);
      setError(null);
      logMessage("No user ID, clearing friends", "info", { userId });
      return;
    }

    console.log("[Friends] 🚀 Initial friends fetch...");
    logMessage("Initial friends fetch", "info", { userId });
    addBreadcrumb("Initial friends fetch started", "friends", { userId });
    
    setLoading(true);
    setError(null);

    fetchFriendsData(userId)
      .then(() => {
        console.log("[Friends] ✅ Initial friends fetch completed");
        logMessage("Initial friends fetch completed", "info", { userId });
      })
      .catch((err) => {
        console.error("[Friends] ❌ Initial friends fetch error:", err);
        logError(err as Error, { 
          userId, 
          operation: "initialFriendsFetch",
          errorType: "initial_friends_fetch_error"
        });
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(`Friends fetch failed: ${errorMessage}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId, fetchFriendsData]);

  return {
    friends,
    refreshFriends,
    refreshContacts,
    loading,
    error,
  };
}

export default useFriends; 