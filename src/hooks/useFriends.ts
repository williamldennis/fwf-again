import { useEffect, useState, useCallback } from 'react';
import { ContactsService, Friend, Contact } from '../services/contactsService';

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
    
    try {
      // Fetch user's contacts and find friends
      console.log("[Friends] 📞 Fetching user's contacts...");
      const allContacts = await ContactsService.fetchUserContacts(userId);
      console.log(`[Friends] ✅ Total contacts retrieved: ${allContacts.length}`);

      console.log("[Friends] 🔍 Processing contacts and finding friends...");
      const friendsWithNamesAndCities = await ContactsService.findFriendsFromContacts(
        allContacts,
        userId
      );
      console.log(`[Friends] ✅ Friends with cities loaded: ${friendsWithNamesAndCities.length}`);

      setFriends(friendsWithNamesAndCities);
      console.log("[Friends] ✅ Friends data loaded successfully");
    } catch (err) {
      console.error("[Friends] ❌ Friends fetch error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to fetch friends: ${errorMessage}`);
      // Don't throw - friends failure shouldn't break the app
    }
  }, []);

  // Refresh friends data
  const refreshFriends = useCallback(async (): Promise<void> => {
    if (!userId) return;
    
    console.log("[Friends] 🔄 Refreshing friends data...");
    setLoading(true);
    setError(null);

    try {
      await fetchFriendsData(userId);
      console.log("[Friends] ✅ Friends refresh completed!");
    } catch (err) {
      console.error("[Friends] ❌ Friends refresh error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Friends refresh failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [userId, fetchFriendsData]);

  // Refresh contacts from device
  const refreshContacts = useCallback(async (): Promise<{ success: boolean; contactCount: number; error?: string }> => {
    if (!userId) {
      return { success: false, contactCount: 0, error: "No user ID provided" };
    }

    console.log("[Friends] 📱 Refreshing contacts from device...");
    
    try {
      const result = await ContactsService.refreshContacts();
      
      if (result.success) {
        console.log(`[Friends] ✅ Contacts refreshed: ${result.contactCount} contacts`);
        // Refresh friends data after contacts are updated
        await refreshFriends();
      } else {
        console.error("[Friends] ❌ Contacts refresh failed:", result.error);
      }
      
      return result;
    } catch (err) {
      console.error("[Friends] ❌ Contacts refresh error:", err);
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
      return;
    }

    console.log("[Friends] 🚀 Initial friends fetch...");
    setLoading(true);
    setError(null);

    fetchFriendsData(userId)
      .then(() => {
        console.log("[Friends] ✅ Initial friends fetch completed");
      })
      .catch((err) => {
        console.error("[Friends] ❌ Initial friends fetch error:", err);
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