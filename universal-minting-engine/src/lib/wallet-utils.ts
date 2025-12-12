import { createPublicClient } from '@/lib/config';
import { formatEther } from 'viem';

/**
 * Wallet utility functions for balance checking and validation
 */

export interface WalletBalance {
    address: string;
    balance: string; // in ETH
    balanceWei: bigint;
    hasMinimumBalance: boolean;
    minimumRequired: string; // in ETH
}

/**
 * Check if a wallet has sufficient balance for transaction
 */
export async function checkWalletBalance(
    address: string,
    estimatedGasLimit: bigint = BigInt(800000)
): Promise<WalletBalance> {
    try {
        const publicClient = createPublicClient();

        // Get current balance
        const balance = await publicClient.getBalance({
            address: address as `0x${string}`
        });

        // Get actual current gas price from network
        let gasPrice: bigint;
        try {
            gasPrice = await publicClient.getGasPrice();
        } catch (gasPriceError) {
            console.warn('Could not fetch gas price, using default:', gasPriceError);
            gasPrice = BigInt(20) * BigInt(1e9); // 20 Gwei fallback
        }

        // Calculate minimum required balance (gas limit * gas price)
        const minimumRequiredWei = estimatedGasLimit * gasPrice;

        // Add 20% buffer for gas price fluctuations
        const minimumWithBuffer = minimumRequiredWei + (minimumRequiredWei / BigInt(5));

        const balanceEth = parseFloat(formatEther(balance));
        const minimumEth = parseFloat(formatEther(minimumWithBuffer));

        console.log(`Balance check: ${balanceEth} ETH available, ${minimumEth} ETH required (gas price: ${Number(gasPrice) / 1e9} Gwei)`);

        return {
            address,
            balance: formatEther(balance),
            balanceWei: balance,
            hasMinimumBalance: balance >= minimumWithBuffer,
            minimumRequired: formatEther(minimumWithBuffer)
        };
    } catch (error) {
        console.error('Failed to check wallet balance:', error);
        throw new Error(`Failed to check balance for address ${address}`);
    }
}

/**
 * Get current gas price from the network
 */
export async function getCurrentGasPrice(): Promise<bigint> {
    try {
        const publicClient = createPublicClient();
        return await publicClient.getGasPrice();
    } catch (error) {
        console.error('Failed to get gas price:', error);
        // Return default gas price (20 Gwei) if unable to fetch
        return BigInt(20) * BigInt(1e9);
    }
}

/**
 * Estimate total transaction cost including gas
 */
export async function estimateTransactionCost(
    to: string,
    data: string,
    from: string,
    gasLimit?: bigint
): Promise<{
    gasLimit: bigint;
    gasPrice: bigint;
    totalCost: bigint;
    totalCostEth: string;
}> {
    try {
        const publicClient = createPublicClient();

        // Get current gas price
        const gasPrice = await getCurrentGasPrice();

        // Estimate gas if not provided
        let estimatedGas = gasLimit;
        if (!estimatedGas) {
            try {
                estimatedGas = await publicClient.estimateGas({
                    to: to as `0x${string}`,
                    data: data as `0x${string}`,
                    account: from as `0x${string}`,
                });
                // Add 20% buffer
                estimatedGas = estimatedGas + (estimatedGas / BigInt(5));
            } catch (gasError) {
                console.warn('Gas estimation failed, using default:', gasError);
                estimatedGas = BigInt(800000); // Default fallback
            }
        }

        const totalCost = estimatedGas * gasPrice;

        return {
            gasLimit: estimatedGas,
            gasPrice,
            totalCost,
            totalCostEth: formatEther(totalCost)
        };
    } catch (error) {
        console.error('Failed to estimate transaction cost:', error);
        throw new Error('Failed to estimate transaction cost');
    }
}

/**
 * Validate wallet address format
 */
export function isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get faucet information for the current network
 */
export function getFaucetInfo(network: string = 'aeneid') {
    const faucets = {
        aeneid: {
            name: 'Story Protocol Aeneid Testnet Faucet',
            urls: [
                'https://faucet.story.foundation',
                'https://testnet.storyscan.xyz/faucet'
            ],
            instructions: [
                'Visit the Story Protocol faucet',
                'Connect your wallet',
                'Request testnet ETH',
                'Wait for the transaction to confirm'
            ]
        }
    };

    return faucets[network as keyof typeof faucets] || faucets.aeneid;
}