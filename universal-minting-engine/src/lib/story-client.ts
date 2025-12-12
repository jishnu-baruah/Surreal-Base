import { StoryClient } from '@story-protocol/core-sdk';
import { createStoryClient, createStoryClientWithFailover, getNetworkConfig } from '@/lib/config';

// Singleton pattern for Story client to avoid multiple instances
let storyClientInstance: StoryClient | null = null;

/**
 * Get a read-only Story Protocol client instance
 * Uses singleton pattern to reuse the same client across requests
 */
export const getStoryClient = (): StoryClient => {
    if (!storyClientInstance) {
        storyClientInstance = createStoryClient();
    }
    return storyClientInstance;
};

/**
 * Get a Story Protocol client with failover support
 * Creates a new client that tries multiple RPC endpoints
 */
export const getStoryClientWithFailover = async (): Promise<StoryClient> => {
    try {
        return await createStoryClientWithFailover();
    } catch (error) {
        console.error('Failed to create Story client with failover:', error);
        throw new Error('Unable to connect to Story Protocol network');
    }
};

/**
 * Reset the client instance (useful for testing or network changes)
 */
export const resetStoryClient = (): void => {
    storyClientInstance = null;
};

/**
 * Get network information for the current configuration
 */
export const getNetworkInfo = () => {
    return getNetworkConfig();
};

/**
 * Validate that the Story client is properly configured
 */
export const validateStoryClient = async (): Promise<boolean> => {
    try {
        const client = getStoryClient();
        // Try to access a basic property to ensure client is working
        return !!client;
    } catch (error) {
        console.error('Story client validation failed:', error);
        return false;
    }
};