import "./App.css";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Logo from "./Logo";
import { useEffect, useMemo, useState, useCallback } from "react";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/web";
import { useAccount, useChainId, useWalletClient, usePublicClient } from "wagmi";
import { getAddress } from "viem";
import type { Address } from "viem";

type Option = { index: number; label: string };

const CONTRACT_ADDRESS_ENV = import.meta.env.VITE_PRIVATE_VOTE_ADDRESS as string | undefined;
const FACTORY_ADDRESS_ENV = import.meta.env.VITE_RATING_FACTORY_ADDRESS as string | undefined;
const RELAYER_URL_ENV = import.meta.env.VITE_ZAMA_RELAYER_URL as string | undefined;
const FAUCET_URL =
  (import.meta.env.VITE_SEPOLIA_FAUCET_URL as string | undefined) || "https://www.alchemy.com/faucets/ethereum-sepolia";

function App() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  // Rating item contract address and factory contract for creating new items
  const [ratingItemAddress, setRatingItemAddress] = useState<string>(CONTRACT_ADDRESS_ENV || "");
  const [factoryAddress, setFactoryAddress] = useState<string>(FACTORY_ADDRESS_ENV || "");
  const [options] = useState<Option[]>([
    { index: 1, label: "Very Poor" },
    { index: 2, label: "Poor" },
    { index: 3, label: "Average" },
    { index: 4, label: "Good" },
    { index: 5, label: "Excellent" },
  ]);
  const [status, setStatus] = useState<string>("Ready to connect wallet");
  const [selected, setSelected] = useState<number | null>(null);
  const [isGranting, setIsGranting] = useState<boolean>(false);
  const [hasGranted, setHasGranted] = useState<boolean>(false);
  const [creationFee, setCreationFee] = useState<string>("0.001");
  const [revealFee] = useState<string>("0.0005");
  const [promoteFee, setPromoteFee] = useState<string>("0.01");
  const [showInsights, setShowInsights] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>("");
  const [leaderboardScope, setLeaderboardScope] = useState<"day" | "week" | "all">("week");
  const mockSeries = useMemo(() => {
    const days = 12;
    const cats = 5;
    const data: number[][] = [];
    for (let d = 0; d < days; d++) {
      const row: number[] = [];
      for (let c = 0; c < cats; c++) {
        const base = leaderboardScope === "week" ? 4 : 7;
        row.push(Math.max(1, Math.round(Math.random() * base + d)));
      }
      data.push(row);
    }
    return data;
  }, [leaderboardScope]);
  const [lbData, setLbData] = useState<number[][]>([]);
  useEffect(() => {
    setLbData(mockSeries);
  }, [mockSeries]);
  // day labels reserved for future time-series chart
  // optional lists removed for now
  type CatalogModel = { name: string; tags?: string[]; url?: string; address?: string };
  const MODELS_URL = (import.meta.env.VITE_MODELS_URL as string | undefined) || "/models.json";
  const [catalog, setCatalog] = useState<CatalogModel[]>([]);
  const [catalogTab, setCatalogTab] = useState<"trending" | "top" | "most">("trending");
  const [catalogQuery, setCatalogQuery] = useState<string>("");
  const [rateQuery, setRateQuery] = useState<string>("");
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");

  // AI Integration States
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [aiInsights, setAiInsights] = useState<{
    model: string;
    analysis: {
      insights: string;
      sentiment: string;
      recommendations: string;
      positioning: string;
      confidence: number;
    };
    timestamp: string;
    ratings: number;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiApiKey, setAiApiKey] = useState<string>("");
  const [showAiFeatures, setShowAiFeatures] = useState<boolean>(false);
  const [aiRevenue, setAiRevenue] = useState<number>(0);
  const [aiUsage, setAiUsage] = useState<number>(0);

  // AI Business Solutions States
  const [showBusinessSolutions, setShowBusinessSolutions] = useState<boolean>(false);
  const [businessAnalytics, setBusinessAnalytics] = useState<{
    type: string;
    insights: string;
    timestamp: string;
    privacyLevel: string;
  } | null>(null);
  const [workflowData, setWorkflowData] = useState<
    {
      id: number;
      workflow: string;
      timestamp: string;
      status: string;
    }[]
  >([]);
  const [customerInsights, setCustomerInsights] = useState<{
    insights: string;
    timestamp: string;
    privacyLevel: string;
    dataSource: string;
  } | null>(null);
  const [isProcessingData, setIsProcessingData] = useState<boolean>(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [minRating, setMinRating] = useState<number>(0);
  const [maxRating, setMaxRating] = useState<number>(5);
  const [sortBy, setSortBy] = useState<string>("name");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Error handling states
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<"network" | "wallet" | "contract" | "validation" | "general">("general");
  const [showError, setShowError] = useState<boolean>(false);

  // Error handling functions
  const handleError = useCallback(
    (error: unknown, type: "network" | "wallet" | "contract" | "validation" | "general" = "general") => {
      console.error("Error:", error);

      const errorMsg = error instanceof Error ? error.message : String(error);
      let errorMessage = "An unexpected error occurred";

      if (type === "network") {
        if (errorMsg.includes("timeout") || errorMsg.includes("408")) {
          errorMessage = "Network timeout. Please check your connection and try again.";
        } else if (errorMsg.includes("fetch")) {
          errorMessage = "Network error. Please check your internet connection.";
        } else {
          errorMessage = "Network error. Please try again later.";
        }
      } else if (type === "wallet") {
        if (errorMsg.includes("User rejected")) {
          errorMessage = "Transaction was cancelled by user.";
        } else if (errorMsg.includes("insufficient funds")) {
          errorMessage = "Insufficient funds. Please add more ETH to your wallet.";
        } else if (errorMsg.includes("wrong network")) {
          errorMessage = "Please switch to Sepolia testnet.";
        } else {
          errorMessage = "Wallet error. Please check your wallet connection.";
        }
      } else if (type === "contract") {
        if (errorMsg.includes("execution reverted")) {
          errorMessage = "Transaction failed. Please check the contract state.";
        } else if (errorMsg.includes("gas")) {
          errorMessage = "Transaction failed due to gas issues. Please try again.";
        } else {
          errorMessage = "Smart contract error. Please try again.";
        }
      } else if (type === "validation") {
        errorMessage = errorMsg || "Invalid input. Please check your data.";
      } else {
        errorMessage = errorMsg;
      }

      setError(errorMessage);
      setErrorType(type);
      setShowError(true);
      setToast(`❌ ${errorMessage}`);

      // Auto-hide error after 5 seconds
      setTimeout(() => {
        setShowError(false);
        setError(null);
      }, 5000);
    },
    [],
  );

  const clearError = useCallback(() => {
    setShowError(false);
    setError(null);
  }, []);

  useEffect(() => {
    let alive = true;
    setIsLoading(true);
    (async () => {
      try {
        const res = await fetch(MODELS_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as CatalogModel[];
        if (alive) {
          setCatalog(data);
          setIsLoading(false);
        }
      } catch {
        const fallback: CatalogModel[] = [
          { name: "OpenAI GPT-4.1 Mini", tags: ["general"] },
          { name: "Anthropic Claude Sonnet 4", tags: ["general"] },
          { name: "Google Gemini 2.5 Pro", tags: ["general"] },
          { name: "Google Gemini 2.5 Flash", tags: ["general"] },
          { name: "DeepSeek V3.1", tags: ["coding"] },
          { name: "Grok Code Fast 1", tags: ["coding"] },
          { name: "Sonoma Sky Alpha", tags: ["general"] },
          { name: "Gemini 2.0 Flash", tags: ["general"] },
          { name: "DeepSeek V3 0324", tags: ["coding"] },
          { name: "GPT-5 (preview)", tags: ["general"] },
        ];
        if (alive) {
          setCatalog(fallback);
          setIsLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [MODELS_URL]);
  const filteredCatalog = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    let base = catalog;

    // Enhanced search - search multiple fields
    if (q) {
      base = catalog.filter((m) => {
        const nameMatch = m.name.toLowerCase().includes(q);
        const tagsMatch = m.tags?.some((tag) => tag.toLowerCase().includes(q)) || false;
        const addressMatch = m.address?.toLowerCase().includes(q) || false;

        return nameMatch || tagsMatch || addressMatch;
      });
    }

    // Advanced filters
    // Category filter
    if (selectedCategory !== "all") {
      base = base.filter((m) => m.tags?.some((tag) => tag.toLowerCase() === selectedCategory.toLowerCase()));
    }

    // Rating range filter (mock data for demo) - only apply if not default range
    if (minRating > 0 || maxRating < 5) {
      base = base.filter((m) => {
        // Use a deterministic "rating" based on model name for consistent results
        const mockRating = (m.name.length % 5) + 1; // Mock rating 1-5 based on name length
        return mockRating >= minRating && mockRating <= maxRating;
      });
    }

    // If no results and there's a query, return empty array
    if (q && base.length === 0) {
      return [];
    }

    // Sort based on tab and advanced sort
    const score = (name: string) => name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

    if (sortBy === "name") {
      base = base.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "rating") {
      base = base.sort((a, b) => {
        const ratingA = (a.name.length % 5) + 1;
        const ratingB = (b.name.length % 5) + 1;
        return ratingB - ratingA; // High to low
      });
    } else if (sortBy === "popularity") {
      base = base.sort((a, b) => {
        const popularityA = a.name.length;
        const popularityB = b.name.length;
        return popularityB - popularityA; // High to low
      });
    } else {
      // Default tab-based sorting
      if (catalogTab === "trending") base = base.sort((a, b) => (score(b.name) % 97) - (score(a.name) % 97));
      if (catalogTab === "top") base = base.sort((a, b) => a.name.localeCompare(b.name));
      if (catalogTab === "most") base = base.sort((a, b) => (score(b.name) % 137) - (score(a.name) % 137));
    }

    return base;
  }, [catalog, debouncedQuery, catalogTab, selectedCategory, minRating, maxRating, sortBy]);
  const rateSuggestions = useMemo(() => {
    const q = rateQuery.trim().toLowerCase();
    if (!q || q.startsWith("0x")) return [] as CatalogModel[];
    return catalog.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 6);
  }, [catalog, rateQuery]);

  // Generate search suggestions
  const generateSuggestions = useCallback(
    (query: string) => {
      if (query.length < 2) {
        setSearchSuggestions([]);
        return;
      }

      const allNames = catalog.map((m) => m.name);
      const allTags = catalog.flatMap((m) => m.tags || []);
      const allAddresses = catalog.map((m) => m.address).filter(Boolean);

      const matches = [...allNames, ...allTags, ...allAddresses]
        .filter((item): item is string => item !== undefined && item.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8);

      setSearchSuggestions([...new Set(matches)]);
    },
    [catalog],
  );

  // Track search history
  const trackSearch = useCallback(
    (query: string) => {
      if (query.trim() && !searchHistory.includes(query)) {
        setSearchHistory((prev) => [query, ...prev].slice(0, 10));
      }
    },
    [searchHistory],
  );

  // Handle search input change
  const handleSearchChange = useCallback(
    (value: string) => {
      setCatalogQuery(value);
      generateSuggestions(value);
      setShowSuggestions(value.length > 0);
    },
    [generateSuggestions],
  );

  // Handle search suggestion click
  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setCatalogQuery(suggestion);
      setShowSuggestions(false);
      trackSearch(suggestion);
    },
    [trackSearch],
  );

  // Debounced search for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(catalogQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [catalogQuery]);

  // AI Analysis Functions
  const analyzeRatingsWithAI = useCallback(
    async (modelName: string, ratings: number[]) => {
      if (!aiApiKey) {
        setToast("Please enter your OpenAI API key first");
        return;
      }

      setIsAnalyzing(true);
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${aiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content: `You are an AI analyst for the FHEVM Rating System. Analyze encrypted rating data and provide insights about AI model performance. 
              The ratings are encrypted on-chain using FHEVM, ensuring privacy while allowing aggregate analysis.`,
              },
              {
                role: "user",
                content: `Analyze the rating data for AI model "${modelName}":
              
              Rating Distribution: ${ratings.join(", ")}
              Total Ratings: ${ratings.length}
              Average Rating: ${(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)}
              
              Please provide:
              1. Performance insights
              2. User sentiment analysis
              3. Improvement recommendations
              4. Market positioning
              5. Confidence score (1-10)
              
              Format as JSON with keys: insights, sentiment, recommendations, positioning, confidence`,
              },
            ],
            max_tokens: 1000,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const analysis = JSON.parse(data.choices[0].message.content);

        setAiInsights({
          model: modelName,
          analysis,
          timestamp: new Date().toISOString(),
          ratings: ratings.length,
        });

        // Track revenue and usage
        setAiRevenue((prev) => prev + 0.1);
        setAiUsage((prev) => prev + 1);

        setToast("AI analysis completed successfully! +$0.10 revenue");
      } catch (error) {
        console.error("AI Analysis Error:", error);
        handleError(error, "network");
      } finally {
        setIsAnalyzing(false);
      }
    },
    [aiApiKey, handleError],
  );

  const generateModelRecommendations = useCallback(async () => {
    if (!aiApiKey) {
      setToast("Please enter your OpenAI API key first");
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are an AI consultant for the FHEVM Rating System. Provide strategic recommendations for AI model development and market positioning.`,
            },
            {
              role: "user",
              content: `Based on the current AI model catalog and rating trends, provide:
              
              1. Top 5 emerging AI model categories
              2. Market opportunities in AI development
              3. Technical recommendations for model improvement
              4. Revenue optimization strategies
              5. FHEVM integration benefits
              
              Format as structured recommendations with actionable insights.`,
            },
          ],
          max_tokens: 1200,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      setAiAnalysis(data.choices[0].message.content);
      setToast("AI recommendations generated successfully!");
    } catch (error) {
      console.error("AI Recommendations Error:", error);
      handleError(error, "network");
    } finally {
      setIsAnalyzing(false);
    }
  }, [aiApiKey, handleError]);

  // AI Business Solutions Functions
  const processSecureData = useCallback(
    async (dataType: string) => {
      if (!aiApiKey) {
        setToast("Please enter your OpenAI API key first");
        return;
      }

      setIsProcessingData(true);
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${aiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content: `You are an AI business analyst for the FHEVM Business Solutions platform. 
              Analyze encrypted business data and provide insights while maintaining privacy. 
              The data is encrypted using FHEVM, ensuring complete privacy while allowing analysis.`,
              },
              {
                role: "user",
                content: `Analyze ${dataType} data for business insights:
              
              Data Type: ${dataType}
              Privacy Level: FHEVM Encrypted
              Analysis Requirements: Business Intelligence
              
              Please provide:
              1. Key performance indicators
              2. Trend analysis
              3. Risk assessment
              4. Optimization recommendations
              5. Revenue opportunities
              
              Format as structured business insights with actionable recommendations.`,
              },
            ],
            max_tokens: 1200,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        setBusinessAnalytics({
          type: dataType,
          insights: data.choices[0].message.content,
          timestamp: new Date().toISOString(),
          privacyLevel: "FHEVM Encrypted",
        });

        // Track revenue
        setAiRevenue((prev) => prev + 0.25);
        setAiUsage((prev) => prev + 1);

        setToast("Business analytics completed successfully! +$0.25 revenue");
      } catch (error) {
        console.error("Business Analytics Error:", error);
        handleError(error, "network");
      } finally {
        setIsProcessingData(false);
      }
    },
    [aiApiKey, handleError],
  );

  const generateWorkflowAutomation = useCallback(async () => {
    if (!aiApiKey) {
      setToast("Please enter your OpenAI API key first");
      return;
    }

    setIsProcessingData(true);
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are an AI workflow automation specialist for the FHEVM Business Solutions platform. 
              Design automated workflows that process encrypted data while maintaining privacy.`,
            },
            {
              role: "user",
              content: `Design automated workflows for business processes:
              
              Requirements:
              - Privacy-preserving data processing
              - Automated decision making
              - Workflow optimization
              - Error handling
              - Performance monitoring
              
              Please provide:
              1. Workflow architecture
              2. Automation steps
              3. Privacy safeguards
              4. Performance metrics
              5. Cost optimization
              
              Format as structured workflow automation plan.`,
            },
          ],
          max_tokens: 1000,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      setWorkflowData((prev) => [
        ...prev,
        {
          id: Date.now(),
          workflow: data.choices[0].message.content,
          timestamp: new Date().toISOString(),
          status: "Generated",
        },
      ]);

      // Track revenue
      setAiRevenue((prev) => prev + 0.5);
      setAiUsage((prev) => prev + 1);

      setToast("Workflow automation generated successfully! +$0.50 revenue");
    } catch (error) {
      console.error("Workflow Automation Error:", error);
      handleError(error, "network");
    } finally {
      setIsProcessingData(false);
    }
  }, [aiApiKey, handleError]);

  const generateCustomerInsights = useCallback(async () => {
    if (!aiApiKey) {
      setToast("Please enter your OpenAI API key first");
      return;
    }

    setIsProcessingData(true);
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are an AI customer insights analyst for the FHEVM Business Solutions platform. 
              Analyze customer behavior and preferences while maintaining complete privacy using encrypted data.`,
            },
            {
              role: "user",
              content: `Generate customer insights from encrypted data:
              
              Analysis Focus:
              - Customer behavior patterns
              - Preference analysis
              - Engagement metrics
              - Satisfaction indicators
              - Retention factors
              
              Privacy Requirements:
              - Individual data remains encrypted
              - Only aggregated insights revealed
              - FHEVM privacy preservation
              
              Please provide:
              1. Customer segmentation
              2. Behavior analysis
              3. Preference insights
              4. Engagement recommendations
              5. Retention strategies
              
              Format as comprehensive customer insights report.`,
            },
          ],
          max_tokens: 1200,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      setCustomerInsights({
        insights: data.choices[0].message.content,
        timestamp: new Date().toISOString(),
        privacyLevel: "FHEVM Encrypted",
        dataSource: "Encrypted Customer Data",
      });

      // Track revenue
      setAiRevenue((prev) => prev + 0.75);
      setAiUsage((prev) => prev + 1);

      setToast("Customer insights generated successfully! +$0.75 revenue");
    } catch (error) {
      console.error("Customer Insights Error:", error);
      handleError(error, "network");
    } finally {
      setIsProcessingData(false);
    }
  }, [aiApiKey, handleError]);
  const [newTags, setNewTags] = useState<string>("");
  const [toast, setToast] = useState<string>("");
  const [question, setQuestion] = useState<string>("");

  const canUseSepolia = chainId === 11155111;

  const voters = useMemo(() => lbData.reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0), [lbData]);

  const friendlyError = (e: unknown): string => {
    const msg = e instanceof Error ? e.message : String(e);
    if (/User rejected/i.test(msg)) return "";
    return msg;
  };

  useEffect(() => {
    try {
      if (!address || !ratingItemAddress || !chainId) return;
      const key = `grant:${chainId}:${ratingItemAddress}:${address}`;
      const v = localStorage.getItem(key);
      setHasGranted(v === "1");
    } catch {
      // ignore
    }
  }, [address, ratingItemAddress, chainId]);

  // Load fees and promoted items from factory
  useEffect(() => {
    const loadFactoryData = async () => {
      if (!factoryAddress || !publicClient) return;

      try {
        // Load fees
        const [creationFeeResult, promoteFeeResult] = await Promise.all([
          publicClient.readContract({
            address: factoryAddress as Address,
            abi: [
              {
                name: "creationFee",
                type: "function",
                stateMutability: "view",
                inputs: [],
                outputs: [{ name: "", type: "uint256" }],
              },
            ],
            functionName: "creationFee",
          }),
          publicClient.readContract({
            address: factoryAddress as Address,
            abi: [
              {
                name: "promoteFee",
                type: "function",
                stateMutability: "view",
                inputs: [],
                outputs: [{ name: "", type: "uint256" }],
              },
            ],
            functionName: "promoteFee",
          }),
        ]);

        setCreationFee((Number(creationFeeResult) / 1e18).toFixed(3));
        setPromoteFee((Number(promoteFeeResult) / 1e18).toFixed(3));

        // Load promoted items (commented out for now)
        // const promotedResult = await publicClient.readContract({
        //   address: factoryAddress as Address,
        //   abi: [
        //     {
        //       name: "getPromotedItems",
        //       type: "function",
        //       stateMutability: "view",
        //       inputs: [],
        //       outputs: [{ name: "", type: "address[]" }],
        //     },
        //   ],
        //   functionName: "getPromotedItems",
        // });

        // setPromotedItems(promotedResult as string[]);
      } catch (e) {
        console.warn("Failed to load factory data:", e);
      }
    };

    loadFactoryData();
  }, [factoryAddress, publicClient]);

  return (
    <div className="layout">
      <aside className="sidebar">
        {/* Horizontal Navigation Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            padding: "20px 28px",
            background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fbbf24 100%)",
            borderRadius: "16px",
            border: "2px solid #f59e0b",
            boxShadow: "0 8px 24px rgba(245, 158, 11, 0.3), 0 4px 12px rgba(0, 0, 0, 0.1)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background Pattern */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                "radial-gradient(circle at 20% 80%, rgba(245, 158, 11, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(217, 119, 6, 0.1) 0%, transparent 50%)",
              pointerEvents: "none",
            }}
          />
          {/* Left: Brand */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              flex: "0 0 auto",
              minWidth: "200px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 48,
                height: 48,
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(245, 158, 11, 0.4)",
              }}
            >
              <Logo size={28} />
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                background: "linear-gradient(135deg, #92400e 0%, #d97706 50%, #f59e0b 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                textShadow: "0 2px 4px rgba(245, 158, 11, 0.3)",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              TrustVault AI
            </div>
          </div>

          {/* Center: Description */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              padding: "0 24px",
            }}
          >
            <div
              style={{
                fontSize: 15,
                color: "#92400e",
                fontWeight: 600,
                textAlign: "center",
                lineHeight: 1.4,
                maxWidth: "500px",
                fontStyle: "italic",
                textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
              }}
            >
              Safe experimentation with Zama FHEVM testnet
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flex: "0 0 auto",
              minWidth: "300px",
              justifyContent: "flex-end",
            }}
          >
            {/* Feature Buttons */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginRight: 16,
              }}
            >
              <button
                className="btn-outline"
                style={{
                  padding: "8px 16px",
                  fontSize: 12,
                  borderRadius: "8px",
                  fontWeight: 700,
                  transition: "all 0.3s ease",
                  whiteSpace: "nowrap",
                  minWidth: "60px",
                  textAlign: "center",
                  background: showInsights ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "transparent",
                  color: showInsights ? "white" : "var(--yellow-600)",
                  border: showInsights ? "2px solid #d97706" : "2px solid var(--yellow-300)",
                  transform: showInsights ? "scale(1.05)" : "scale(1)",
                  boxShadow: showInsights ? "0 4px 12px rgba(245, 158, 11, 0.3)" : "0 2px 4px rgba(245, 158, 11, 0.1)",
                }}
                onClick={() => {
                  setShowInsights(!showInsights);
                  if (!showInsights) {
                    setTimeout(() => {
                      const element = document.getElementById("insights-section");
                      if (element) {
                        element.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }, 100);
                  }
                }}
              >
                📊 API
              </button>
              <button
                className="btn-outline"
                style={{
                  padding: "8px 16px",
                  fontSize: 12,
                  borderRadius: "8px",
                  fontWeight: 700,
                  transition: "all 0.3s ease",
                  whiteSpace: "nowrap",
                  minWidth: "60px",
                  textAlign: "center",
                  background: showAiFeatures ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "transparent",
                  color: showAiFeatures ? "white" : "var(--yellow-600)",
                  border: showAiFeatures ? "2px solid #d97706" : "2px solid var(--yellow-300)",
                  transform: showAiFeatures ? "scale(1.05)" : "scale(1)",
                  boxShadow: showAiFeatures
                    ? "0 4px 12px rgba(245, 158, 11, 0.3)"
                    : "0 2px 4px rgba(245, 158, 11, 0.1)",
                }}
                onClick={() => {
                  setShowAiFeatures(!showAiFeatures);
                  if (!showAiFeatures) {
                    setTimeout(() => {
                      const element = document.getElementById("ai-features-section");
                      if (element) {
                        element.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }, 100);
                  }
                }}
              >
                🤖 AI
              </button>
              <button
                className="btn-outline"
                style={{
                  padding: "8px 16px",
                  fontSize: 12,
                  borderRadius: "8px",
                  fontWeight: 700,
                  transition: "all 0.3s ease",
                  whiteSpace: "nowrap",
                  minWidth: "60px",
                  textAlign: "center",
                  background: showBusinessSolutions
                    ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                    : "transparent",
                  color: showBusinessSolutions ? "white" : "var(--yellow-600)",
                  border: showBusinessSolutions ? "2px solid #d97706" : "2px solid var(--yellow-300)",
                  transform: showBusinessSolutions ? "scale(1.05)" : "scale(1)",
                  boxShadow: showBusinessSolutions
                    ? "0 4px 12px rgba(245, 158, 11, 0.3)"
                    : "0 2px 4px rgba(245, 158, 11, 0.1)",
                }}
                onClick={() => {
                  setShowBusinessSolutions(!showBusinessSolutions);
                  if (!showBusinessSolutions) {
                    setTimeout(() => {
                      const element = document.getElementById("business-solutions-section");
                      if (element) {
                        element.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }, 100);
                  }
                }}
              >
                🏢 Business
              </button>
            </div>

            {/* Utility Buttons */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <a
                href="https://sepoliafaucet.com/"
                target="_blank"
                rel="noreferrer"
                className="btn-outline"
                style={{
                  textDecoration: "none",
                  padding: "8px 16px",
                  fontSize: 12,
                  borderRadius: "8px",
                  fontWeight: 700,
                  transition: "all 0.3s ease",
                  whiteSpace: "nowrap",
                  minWidth: "70px",
                  textAlign: "center",
                }}
              >
                💧 Faucet
              </a>
              <div
                className="wallet"
                style={{
                  display: "flex",
                  alignItems: "center",
                  transform: "scale(0.9)",
                  transformOrigin: "center",
                }}
              >
                <ConnectButton />
              </div>
            </div>
          </div>
        </div>
      </aside>
      <main className="content">
        <div className="container">
          <div className="hero hero-yellow">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 80,
                  height: 80,
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  borderRadius: "20px",
                  boxShadow: "0 8px 24px rgba(245, 158, 11, 0.4), 0 4px 12px rgba(0, 0, 0, 0.1)",
                  marginRight: 20,
                }}
              >
                <Logo size={48} />
              </div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 900,
                  background: "linear-gradient(135deg, #92400e 0%, #d97706 50%, #f59e0b 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  textShadow: "0 4px 8px rgba(245, 158, 11, 0.3)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                }}
              >
                TrustVault AI
              </div>
            </div>

            {/* Enhanced Subtitle */}
            <div
              style={{
                fontSize: 18,
                color: "#92400e",
                fontWeight: 600,
                textAlign: "center",
                lineHeight: 1.6,
                maxWidth: "800px",
                margin: "0 auto 24px",
                textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                fontStyle: "italic",
              }}
            >
              🛡️ <strong>TrustVault AI</strong> - Enterprise-Grade Confidential AI Model Rating Platform
            </div>

            <div
              style={{
                fontSize: 16,
                color: "#d97706",
                fontWeight: 500,
                textAlign: "center",
                lineHeight: 1.5,
                maxWidth: "700px",
                margin: "0 auto 20px",
                padding: "16px 24px",
                background: "linear-gradient(135deg, rgba(254, 243, 199, 0.3) 0%, rgba(253, 230, 138, 0.3) 100%)",
                borderRadius: "12px",
                border: "1px solid rgba(245, 158, 11, 0.2)",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  color: "#92400e",
                  fontWeight: 500,
                  textAlign: "center",
                  lineHeight: 1.4,
                  maxWidth: "600px",
                  margin: "0 auto",
                  opacity: 0.8,
                }}
              >
                Individual votes remain <strong>completely confidential</strong> — only you can decrypt your own ratings
              </div>
            </div>

            {aiApiKey && (
              <div
                style={{
                  marginTop: 24,
                  padding: "16px 24px",
                  background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                  borderRadius: 16,
                  border: "2px solid #f59e0b",
                  fontSize: 15,
                  color: "#92400e",
                  fontWeight: 600,
                  textAlign: "center",
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
                }}
              >
                🤖 <strong>AI-Powered Analytics:</strong> Get intelligent insights from your encrypted ratings using
                OpenAI GPT-4
              </div>
            )}
          </div>

          <div id="leaderboard" className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 22,
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  textShadow: "0 4px 8px rgba(245, 158, 11, 0.4)",
                  letterSpacing: "0.5px",
                }}
              >
                🏆 Trending AI Models
              </div>
              <div className="lb-toolbar">
                <button
                  className={`lb-toggle ${leaderboardScope === "day" ? "active" : ""}`}
                  onClick={() => setLeaderboardScope("day")}
                  style={{
                    background:
                      leaderboardScope === "day" ? "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)" : "transparent",
                    color: leaderboardScope === "day" ? "#92400e" : "var(--muted)",
                    border: leaderboardScope === "day" ? "2px solid #f59e0b" : "1px solid var(--border)",
                    fontWeight: 600,
                  }}
                >
                  📅 This Day
                </button>
                <button
                  className={`lb-toggle ${leaderboardScope === "week" ? "active" : ""}`}
                  onClick={() => setLeaderboardScope("week")}
                  style={{
                    background:
                      leaderboardScope === "week" ? "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)" : "transparent",
                    color: leaderboardScope === "week" ? "#92400e" : "var(--muted)",
                    border: leaderboardScope === "week" ? "2px solid #f59e0b" : "1px solid var(--border)",
                    fontWeight: 600,
                  }}
                >
                  📊 This Week
                </button>
                <button
                  className={`lb-toggle ${leaderboardScope === "all" ? "active" : ""}`}
                  onClick={() => setLeaderboardScope("all")}
                  style={{
                    background:
                      leaderboardScope === "all" ? "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)" : "transparent",
                    color: leaderboardScope === "all" ? "#92400e" : "var(--muted)",
                    border: leaderboardScope === "all" ? "2px solid #f59e0b" : "1px solid var(--border)",
                    fontWeight: 600,
                  }}
                >
                  🏆 All Time
                </button>
              </div>
            </div>
            <div className="list">
              {filteredCatalog.slice(0, 10).map((m, i) => (
                <div key={i} className="list-item">
                  <div className="list-item-name">
                    <span
                      style={{
                        fontWeight: 700,
                        color: "var(--yellow-600)",
                        marginRight: 8,
                      }}
                    >
                      #{i + 1}
                    </span>
                    {m.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flex: 1 }}>
                    <span
                      className="voter-count"
                      style={{
                        background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                        padding: "4px 12px",
                        borderRadius: 16,
                        border: "2px solid #f59e0b",
                        boxShadow: "0 3px 8px rgba(245, 158, 11, 0.3)",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#92400e",
                      }}
                    >
                      👥 {Math.floor(Math.random() * 100) + 10} votes
                    </span>
                    <div className="chipbar">
                      {(m.tags || ["AI"]).map((t) => (
                        <span key={t} className="chip">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 22,
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  textShadow: "0 4px 8px rgba(245, 158, 11, 0.4)",
                  letterSpacing: "0.5px",
                }}
              >
                📚 AI Model Catalog
              </div>
            </div>
            <div className="catalog-tools">
              <div className="search-container" style={{ position: "relative", flex: 1 }}>
                <input
                  className="search"
                  placeholder="Search models, tags, or addresses…"
                  value={catalogQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setShowSuggestions(catalogQuery.length > 0)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />

                {showSuggestions && (searchSuggestions.length > 0 || searchHistory.length > 0) && (
                  <div
                    className="search-suggestions"
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                      zIndex: 1000,
                      maxHeight: "300px",
                      overflowY: "auto",
                      marginTop: "4px",
                    }}
                  >
                    {/* Current Suggestions */}
                    {searchSuggestions.length > 0 && (
                      <div style={{ padding: "8px 0" }}>
                        <div
                          style={{
                            padding: "4px 12px",
                            fontSize: "12px",
                            color: "var(--muted)",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Suggestions
                        </div>
                        {searchSuggestions.map((suggestion, i) => (
                          <button
                            key={i}
                            onClick={() => handleSuggestionClick(suggestion)}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              textAlign: "left",
                              background: "transparent",
                              border: "none",
                              color: "var(--text)",
                              fontSize: "14px",
                              cursor: "pointer",
                              transition: "background 0.2s ease",
                            }}
                            onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.background = "var(--bg-alt)")}
                            onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.background = "transparent")}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Search History */}
                    {searchHistory.length > 0 && (
                      <div
                        style={{
                          padding: "8px 0",
                          borderTop: searchSuggestions.length > 0 ? "1px solid var(--border)" : "none",
                        }}
                      >
                        <div
                          style={{
                            padding: "4px 12px",
                            fontSize: "12px",
                            color: "var(--muted)",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Recent Searches
                        </div>
                        {searchHistory.slice(0, 5).map((term, i) => (
                          <button
                            key={i}
                            onClick={() => handleSuggestionClick(term)}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              textAlign: "left",
                              background: "transparent",
                              border: "none",
                              color: "var(--muted)",
                              fontSize: "14px",
                              cursor: "pointer",
                              transition: "background 0.2s ease",
                            }}
                            onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.background = "var(--bg-alt)")}
                            onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.background = "transparent")}
                          >
                            🔍 {term}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="lb-toolbar">
                <button
                  className={`lb-toggle ${catalogTab === "trending" ? "active" : ""}`}
                  onClick={() => setCatalogTab("trending")}
                  style={{
                    background:
                      catalogTab === "trending" ? "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)" : "transparent",
                    color: catalogTab === "trending" ? "#92400e" : "var(--muted)",
                    border: catalogTab === "trending" ? "2px solid #f59e0b" : "1px solid var(--border)",
                    fontWeight: 600,
                  }}
                >
                  🔥 Trending
                </button>
                <button
                  className={`lb-toggle ${catalogTab === "top" ? "active" : ""}`}
                  onClick={() => setCatalogTab("top")}
                  style={{
                    background:
                      catalogTab === "top" ? "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)" : "transparent",
                    color: catalogTab === "top" ? "#92400e" : "var(--muted)",
                    border: catalogTab === "top" ? "2px solid #f59e0b" : "1px solid var(--border)",
                    fontWeight: 600,
                  }}
                >
                  ⭐ Top Rated
                </button>
                <button
                  className={`lb-toggle ${catalogTab === "most" ? "active" : ""}`}
                  onClick={() => setCatalogTab("most")}
                  style={{
                    background:
                      catalogTab === "most" ? "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)" : "transparent",
                    color: catalogTab === "most" ? "#92400e" : "var(--muted)",
                    border: catalogTab === "most" ? "2px solid #f59e0b" : "1px solid var(--border)",
                    fontWeight: 600,
                  }}
                >
                  👥 Most Rated
                </button>
                <button
                  className="btn-outline"
                  style={{
                    padding: "6px 12px",
                    fontSize: 11,
                    borderRadius: "6px",
                    fontWeight: 600,
                    marginLeft: 8,
                    background: showAdvancedFilters
                      ? "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)"
                      : "transparent",
                    color: showAdvancedFilters ? "#92400e" : "var(--muted)",
                    border: showAdvancedFilters ? "2px solid #f59e0b" : "1px solid var(--border)",
                  }}
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  🔍 Filters
                </button>
                {aiApiKey && (
                  <button
                    className="btn-primary"
                    style={{
                      fontSize: 12,
                      padding: "6px 12px",
                      marginLeft: 8,
                      background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                      border: "2px solid #f59e0b",
                      color: "white",
                      fontWeight: 600,
                    }}
                    onClick={generateModelRecommendations}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? "🤖 AI..." : "🤖 AI Recs"}
                  </button>
                )}
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div
                style={{
                  marginTop: 16,
                  padding: 20,
                  background: "linear-gradient(135deg, rgba(254, 243, 199, 0.1) 0%, rgba(253, 230, 138, 0.1) 100%)",
                  borderRadius: 12,
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 16,
                    alignItems: "end",
                  }}
                >
                  {/* Category Filter */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#92400e",
                        marginBottom: 6,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid #f59e0b",
                        background: "linear-gradient(135deg, #ffffff 0%, #fef3c7 100%)",
                        fontSize: 14,
                        color: "#92400e",
                        fontWeight: 500,
                      }}
                    >
                      <option value="all">All Categories</option>
                      <option value="ai">AI</option>
                      <option value="ml">Machine Learning</option>
                      <option value="nlp">NLP</option>
                      <option value="vision">Computer Vision</option>
                      <option value="general">General</option>
                    </select>
                  </div>

                  {/* Rating Range */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#92400e",
                        marginBottom: 6,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Rating Range
                    </label>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={minRating}
                        onChange={(e) => setMinRating(parseFloat(e.target.value) || 0)}
                        style={{
                          width: "60px",
                          padding: "6px 8px",
                          borderRadius: 4,
                          border: "1px solid #f59e0b",
                          background: "linear-gradient(135deg, #ffffff 0%, #fef3c7 100%)",
                          fontSize: 12,
                          color: "#92400e",
                          textAlign: "center",
                        }}
                        placeholder="Min"
                      />
                      <span style={{ color: "#92400e", fontSize: 12 }}>to</span>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={maxRating}
                        onChange={(e) => setMaxRating(parseFloat(e.target.value) || 5)}
                        style={{
                          width: "60px",
                          padding: "6px 8px",
                          borderRadius: 4,
                          border: "1px solid #f59e0b",
                          background: "linear-gradient(135deg, #ffffff 0%, #fef3c7 100%)",
                          fontSize: 12,
                          color: "#92400e",
                          textAlign: "center",
                        }}
                        placeholder="Max"
                      />
                    </div>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#92400e",
                        marginBottom: 6,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid #f59e0b",
                        background: "linear-gradient(135deg, #ffffff 0%, #fef3c7 100%)",
                        fontSize: 14,
                        color: "#92400e",
                        fontWeight: 500,
                      }}
                    >
                      <option value="name">Name (A-Z)</option>
                      <option value="rating">Rating (High-Low)</option>
                      <option value="popularity">Popularity</option>
                    </select>
                  </div>

                  {/* Clear Filters */}
                  <div>
                    <button
                      onClick={() => {
                        setSelectedCategory("all");
                        setMinRating(0);
                        setMaxRating(5);
                        setSortBy("name");
                      }}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 6,
                        border: "1px solid #f59e0b",
                        background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                        color: "#92400e",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
                        e.currentTarget.style.color = "white";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)";
                        e.currentTarget.style.color = "#92400e";
                      }}
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="catalog-grid">
              {isLoading ? (
                // Skeleton Loading UI
                Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="catalog-card"
                    style={{
                      opacity: 0.7,
                      animation: "pulse 2s infinite",
                    }}
                  >
                    <div
                      style={{
                        height: 20,
                        background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                        borderRadius: 4,
                        marginBottom: 12,
                        backgroundSize: "200% 100%",
                        animation: "shimmer 1.5s infinite",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          height: 16,
                          width: 40,
                          background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                          borderRadius: 8,
                          backgroundSize: "200% 100%",
                          animation: "shimmer 1.5s infinite",
                        }}
                      />
                      <div
                        style={{
                          height: 16,
                          width: 60,
                          background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                          borderRadius: 8,
                          backgroundSize: "200% 100%",
                          animation: "shimmer 1.5s infinite",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          height: 28,
                          width: 60,
                          background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                          borderRadius: 6,
                          backgroundSize: "200% 100%",
                          animation: "shimmer 1.5s infinite",
                        }}
                      />
                      <div
                        style={{
                          height: 28,
                          width: 40,
                          background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                          borderRadius: 6,
                          backgroundSize: "200% 100%",
                          animation: "shimmer 1.5s infinite",
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : filteredCatalog.length > 0 ? (
                filteredCatalog.map((m, i) => (
                  <div key={i} className="catalog-card">
                    <div className="catalog-title">{m.name}</div>
                    <div className="chipbar">
                      {(m.tags || ["AI", "General"]).map((t) => (
                        <span key={t} className="chip">
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="catalog-buttons-row">
                      <div className="catalog-buttons-left">
                        <button
                          className="btn-outline"
                          style={{
                            padding: "6px 12px",
                            fontSize: 11,
                            borderRadius: "6px",
                            minWidth: "auto",
                            height: "auto",
                          }}
                          onClick={() => {
                            setQuestion(m.name);
                            if (m.address) {
                              setRatingItemAddress(m.address);
                              setToast(
                                `Selected "${m.name}" and set its address. Choose stars and press Submit Rating.`,
                              );
                            } else {
                              setToast(`Selected "${m.name}". Paste or set its address to rate.`);
                            }
                          }}
                        >
                          Select
                        </button>
                        <button
                          className="btn-secondary"
                          style={{
                            padding: "6px 12px",
                            fontSize: 11,
                            borderRadius: "6px",
                            minWidth: "auto",
                            height: "auto",
                          }}
                          onClick={() => setCatalog((arr) => arr.filter((x) => x.name !== m.name))}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="catalog-buttons-right">
                        {aiApiKey && (
                          <button
                            className="btn-primary"
                            style={{
                              fontSize: 11,
                              padding: "6px 12px",
                              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                              border: "2px solid #f59e0b",
                              color: "white",
                              fontWeight: 600,
                              borderRadius: "6px",
                              minWidth: "auto",
                              height: "auto",
                            }}
                            onClick={() => {
                              // Simulate ratings for demo
                              const mockRatings = [4, 5, 3, 4, 5, 4, 3, 5, 4, 4];
                              analyzeRatingsWithAI(m.name, mockRatings);
                            }}
                            disabled={isAnalyzing}
                          >
                            {isAnalyzing ? "🤖" : "🔍 AI"}
                          </button>
                        )}
                        {m.address && (
                          <button
                            className="btn-primary"
                            style={{
                              padding: "6px 12px",
                              fontSize: 11,
                              borderRadius: "6px",
                              minWidth: "auto",
                              height: "auto",
                            }}
                            onClick={async () => {
                              try {
                                if (!walletClient || !factoryAddress) return;

                                // Find item ID in factory
                                if (!publicClient) return;
                                const itemId = await publicClient.readContract({
                                  address: factoryAddress as Address,
                                  abi: [
                                    {
                                      name: "getItemsCount",
                                      type: "function",
                                      stateMutability: "view",
                                      inputs: [],
                                      outputs: [{ name: "", type: "uint256" }],
                                    },
                                  ],
                                  functionName: "getItemsCount",
                                });

                                // Find the item ID by checking each item
                                let foundId = -1;
                                for (let i = 0; i < Number(itemId); i++) {
                                  const itemData = await publicClient!.readContract({
                                    address: factoryAddress as Address,
                                    abi: [
                                      {
                                        name: "getItem",
                                        type: "function",
                                        stateMutability: "view",
                                        inputs: [{ name: "id", type: "uint256" }],
                                        outputs: [
                                          { name: "item", type: "address" },
                                          { name: "creator", type: "address" },
                                          { name: "min", type: "uint8" },
                                          { name: "max", type: "uint8" },
                                          { name: "name", type: "string" },
                                          { name: "description", type: "string" },
                                          { name: "isPromoted", type: "bool" },
                                          { name: "promoteExpiry", type: "uint256" },
                                        ],
                                      },
                                    ],
                                    functionName: "getItem",
                                    args: [BigInt(i)],
                                  });

                                  if (itemData[0] === m.address) {
                                    foundId = i;
                                    break;
                                  }
                                }

                                if (foundId === -1) {
                                  setToast("Item not found in factory");
                                  return;
                                }

                                const promoteFeeInWei = BigInt(Math.floor(parseFloat(promoteFee) * 1e18));

                                const hash = await walletClient.writeContract({
                                  abi: [
                                    {
                                      type: "function",
                                      name: "promoteItem",
                                      stateMutability: "payable",
                                      inputs: [{ name: "id", type: "uint256" }],
                                      outputs: [],
                                    },
                                  ],
                                  address: factoryAddress as Address,
                                  functionName: "promoteItem",
                                  args: [BigInt(foundId)],
                                  value: promoteFeeInWei,
                                });

                                setToast(`Promoted "${m.name}" for 7 days! Tx: ${hash}`);
                              } catch (e) {
                                handleError(e, "network");
                              }
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 4, flexDirection: "column" }}>
                              <span style={{ fontSize: 10, fontWeight: 600, lineHeight: 1 }}>Promote</span>
                              <span
                                style={{
                                  background: "var(--yellow-100)",
                                  color: "var(--yellow-800)",
                                  padding: "2px 6px",
                                  borderRadius: 6,
                                  fontSize: 9,
                                  fontWeight: 600,
                                  lineHeight: 1,
                                }}
                              >
                                {promoteFee} ETH
                              </span>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    textAlign: "center",
                    padding: "40px 20px",
                    color: "var(--muted)",
                    fontSize: 16,
                  }}
                >
                  {debouncedQuery ? (
                    <>
                      🔍 No models found for "{debouncedQuery}"
                      <br />
                      <small style={{ fontSize: 14, marginTop: 8, display: "block" }}>
                        Try searching by name, tags, or address
                      </small>
                    </>
                  ) : (
                    "Loading models..."
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 22,
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  textShadow: "0 4px 8px rgba(245, 158, 11, 0.4)",
                  letterSpacing: "0.5px",
                }}
              >
                ⭐ Rate AI Model
              </div>
              <div className="pill">Active</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontWeight: 700,
                  color: "var(--yellow-700)",
                  fontSize: 15,
                  marginBottom: 8,
                  display: "block",
                }}
              >
                📍 Rating Item Address
              </label>
              <div className="form-row combo">
                <input
                  value={ratingItemAddress}
                  onChange={(e) => setRatingItemAddress(e.target.value)}
                  placeholder="Search by model or paste 0x..."
                  onInput={(e) => setRateQuery((e.target as HTMLInputElement).value)}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 8,
                    border: "2px solid var(--yellow-300)",
                    background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#000000",
                  }}
                />
                {rateSuggestions.length > 0 && (
                  <div className="suggest">
                    {rateSuggestions.map((m, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setRateQuery("");
                          setRatingItemAddress(m.address || "");
                          setQuestion(m.name);
                          setToast(`Selected “${m.name}”. Paste or set its address to rate.`);
                        }}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div
              style={{
                color: "#92400e",
                fontSize: 15,
                fontWeight: 600,
                marginBottom: 20,
                padding: "16px 20px",
                background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                borderRadius: 12,
                border: "2px solid #f59e0b",
                boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
                lineHeight: 1.6,
                textAlign: "left",
              }}
            >
              🔒 Rate AI models 1–5 stars with complete privacy. Your individual ratings are encrypted on-chain; only
              aggregated averages can be revealed through your signature.
            </div>

            <div
              style={{
                marginTop: 12,
                color: "var(--yellow-700)",
                fontSize: 14,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              RATE ({options.length})
            </div>
            <div className="options">
              {options.map((o) => (
                <div
                  key={o.index}
                  className={`option ${selected === o.index ? "is-selected" : ""}`}
                  onClick={() => setSelected(o.index)}
                >
                  <input type="radio" checked={selected === o.index} readOnly />
                  <div className="stars" aria-hidden>
                    {new Array(5).fill(0).map((_, i) => (
                      <span key={i} className={`star ${i < o.index ? "filled" : ""}`}>
                        ★
                      </span>
                    ))}
                  </div>
                  {/* remove text label -> stars only */}
                </div>
              ))}
            </div>

            <div className="footer">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--yellow-700)",
                }}
              >
                <span
                  className="voter-count"
                  style={{
                    background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                    padding: "6px 16px",
                    borderRadius: 24,
                    border: "2px solid #f59e0b",
                    boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#92400e",
                  }}
                >
                  👥 {voters} voters
                </span>
              </div>
              <div>
                {/* Hide manual reveal to streamline UX; can add back if needed */}
                <button
                  className="btn-secondary"
                  disabled={!isConnected || !ratingItemAddress || isGranting}
                  onClick={async () => {
                    try {
                      if (!walletClient) throw new Error("No wallet client");
                      setIsGranting(true);
                      setStatus("Enabling reveal…");

                      // Convert reveal fee to wei
                      const revealFeeInWei = BigInt(Math.floor(parseFloat(revealFee) * 1e18));

                      const hash = await walletClient.writeContract({
                        abi: [
                          {
                            type: "function",
                            name: "allowAllTo",
                            stateMutability: "payable",
                            inputs: [{ name: "reader", type: "address" }],
                            outputs: [],
                          },
                        ],
                        address: ratingItemAddress as Address,
                        functionName: "allowAllTo",
                        args: [getAddress(address as Address)],
                        value: revealFeeInWei,
                      });
                      setHasGranted(true);
                      try {
                        const key = `grant:${chainId}:${ratingItemAddress}:${address}`;
                        localStorage.setItem(key, "1");
                      } catch {
                        // ignore write error (private mode, etc.)
                      }
                      setToast("Reveal enabled for your address.");
                      setStatus(`Access granted. Tx: ${hash}`);
                    } catch (e: unknown) {
                      const msg = friendlyError(e);
                      setStatus(msg);
                    } finally {
                      setIsGranting(false);
                    }
                  }}
                >
                  {hasGranted ? (
                    "Reveal Enabled"
                  ) : isGranting ? (
                    "Enabling…"
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span>Enable Reveal</span>
                      <span
                        style={{
                          background: "var(--yellow-100)",
                          color: "var(--yellow-800)",
                          padding: "2px 8px",
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {revealFee} ETH
                      </span>
                    </div>
                  )}
                </button>
                <button
                  style={{ marginLeft: 8 }}
                  disabled={!isConnected || !ratingItemAddress || selected === null}
                  onClick={async () => {
                    try {
                      if (selected === null) return;
                      // Auto-switch to Sepolia if needed
                      if (!canUseSepolia) {
                        try {
                          type Eth = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
                          const eth = (window as unknown as { ethereum?: Eth }).ethereum;
                          await eth?.request({
                            method: "wallet_switchEthereumChain",
                            params: [{ chainId: "0xaa36a7" }],
                          });
                        } catch {
                          setStatus("Please switch network to Sepolia in your wallet.");
                          return;
                        }
                      }
                      setStatus("Encrypting & sending rating… (you may see wallet popups)");
                      const inst = await createInstance(
                        RELAYER_URL_ENV ? { ...SepoliaConfig, relayerUrl: RELAYER_URL_ENV } : SepoliaConfig,
                      );
                      const user = getAddress(address as Address);
                      const enc = await inst
                        .createEncryptedInput(ratingItemAddress as Address, user)
                        .add32(selected)
                        .encrypt();

                      if (!walletClient) throw new Error("No wallet client");
                      const data = {
                        abi: [
                          {
                            type: "function",
                            name: "rate",
                            stateMutability: "nonpayable",
                            inputs: [
                              { name: "inputScore", type: "bytes32" },
                              { name: "inputProof", type: "bytes" },
                            ],
                            outputs: [],
                          },
                        ],
                        functionName: "rate" as const,
                        address: ratingItemAddress as Address,
                        args: [enc.handles[0], enc.inputProof],
                      };
                      const hash = await walletClient.writeContract(data);
                      // Update local leaderboard instantly
                      try {
                        const last = lbData.length - 1;
                        if (last >= 0 && selected >= 1 && selected <= 5) {
                          setLbData((prev) =>
                            prev.map((row, idx) =>
                              idx === last ? row.map((v, j) => (j === selected - 1 ? v + 1 : v)) : row,
                            ),
                          );
                        }
                      } catch {
                        // ignore
                      }
                      setStatus(`Rating tx sent: ${hash}`);
                      setToast("Submitted. You can Reveal Average later once enough ratings.");
                    } catch (e: unknown) {
                      const msg = friendlyError(e);
                      setStatus(msg);
                    }
                  }}
                >
                  Submit Rating
                </button>
              </div>
            </div>

            {/* Average block hidden when auto-flow mode; can be restored to show decrypted summary */}

            {!canUseSepolia && (
              <div
                style={{ color: "#aaa", marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
              >
                กรุณาเชื่อมต่อเครือข่าย Sepolia
                <button
                  className="btn-outline"
                  onClick={async () => {
                    try {
                      type Eth = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
                      const eth = (window as unknown as { ethereum?: Eth }).ethereum;
                      await eth?.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xaa36a7" }] });
                    } catch {
                      setStatus("Please switch network to Sepolia in your wallet.");
                    }
                  }}
                >
                  Switch to Sepolia
                </button>
                <a className="btn-outline" href={FAUCET_URL} target="_blank" rel="noreferrer">
                  Open Sepolia Faucet
                </a>
              </div>
            )}
            <div style={{ marginTop: 6, color: "var(--muted)" }}>{status}</div>
          </div>

          <div id="create-item" className="card" style={{ marginTop: 16 }}>
            <div
              style={{
                fontWeight: 900,
                fontSize: 22,
                marginBottom: 12,
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                textShadow: "0 4px 8px rgba(245, 158, 11, 0.4)",
                letterSpacing: "0.5px",
              }}
            >
              🚀 Create AI Model Rating
            </div>
            <div className="form-grid">
              <div className="form-row">
                <label
                  style={{
                    fontWeight: 700,
                    color: "var(--yellow-700)",
                    fontSize: 15,
                    marginBottom: 8,
                    display: "block",
                  }}
                >
                  📝 AI Model Name
                </label>
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Enter AI model name (e.g., GPT-4, Claude-3, Llama-2)..."
                  style={{
                    padding: "12px 16px",
                    borderRadius: 8,
                    border: "2px solid var(--yellow-300)",
                    background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#000000",
                  }}
                />
              </div>
              <div className="form-row">
                <label
                  style={{
                    fontWeight: 700,
                    color: "var(--yellow-700)",
                    fontSize: 15,
                    marginBottom: 8,
                    display: "block",
                  }}
                >
                  🏷️ Model Categories (comma separated)
                </label>
                <input
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="e.g. general, coding, AI"
                  style={{
                    padding: "12px 16px",
                    borderRadius: 8,
                    border: "2px solid var(--yellow-300)",
                    background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#000000",
                  }}
                />
              </div>
              <div className="form-row">
                <label
                  style={{
                    fontWeight: 700,
                    color: "var(--yellow-700)",
                    fontSize: 15,
                    marginBottom: 8,
                    display: "block",
                  }}
                >
                  🏭 Factory Address
                </label>
                <input
                  value={factoryAddress}
                  onChange={(e) => setFactoryAddress(e.target.value)}
                  placeholder="0x... RatingFactory"
                  style={{
                    padding: "12px 16px",
                    borderRadius: 8,
                    border: "2px solid var(--yellow-300)",
                    background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#000000",
                  }}
                />
              </div>
              <div
                style={{
                  background: "linear-gradient(135deg, var(--yellow-50) 0%, var(--yellow-100) 100%)",
                  padding: 20,
                  borderRadius: 12,
                  marginBottom: 20,
                  border: "2px solid var(--yellow-200)",
                  boxShadow: "0 4px 12px rgba(251, 191, 36, 0.15)",
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    marginBottom: 16,
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    textShadow: "0 4px 8px rgba(245, 158, 11, 0.4)",
                    letterSpacing: "0.5px",
                  }}
                >
                  💰 Fee Structure
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 16,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #f59e0b 100%)",
                      padding: 18,
                      borderRadius: 16,
                      border: "3px solid #f59e0b",
                      textAlign: "center",
                      boxShadow: "0 6px 20px rgba(245, 158, 11, 0.3)",
                      transition: "all 0.3s ease",
                      position: "relative",
                      overflow: "hidden",
                    }}
                    className="fee-box"
                  >
                    <div
                      style={{
                        fontSize: 14,
                        color: "#92400e",
                        marginBottom: 8,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.8px",
                      }}
                    >
                      Create Rating
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: "#78350f",
                        textShadow: "0 2px 4px rgba(120, 53, 15, 0.4)",
                      }}
                    >
                      {creationFee} ETH
                    </div>
                  </div>
                  <div
                    style={{
                      background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #f59e0b 100%)",
                      padding: 18,
                      borderRadius: 16,
                      border: "3px solid #f59e0b",
                      textAlign: "center",
                      boxShadow: "0 6px 20px rgba(245, 158, 11, 0.3)",
                      transition: "all 0.3s ease",
                      position: "relative",
                      overflow: "hidden",
                    }}
                    className="fee-box"
                  >
                    <div
                      style={{
                        fontSize: 14,
                        color: "#92400e",
                        marginBottom: 8,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.8px",
                      }}
                    >
                      Reveal Average
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: "#78350f",
                        textShadow: "0 2px 4px rgba(120, 53, 15, 0.4)",
                      }}
                    >
                      {revealFee} ETH
                    </div>
                  </div>
                  <div
                    style={{
                      background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #f59e0b 100%)",
                      padding: 18,
                      borderRadius: 16,
                      border: "3px solid #f59e0b",
                      textAlign: "center",
                      boxShadow: "0 6px 20px rgba(245, 158, 11, 0.3)",
                      transition: "all 0.3s ease",
                      position: "relative",
                      overflow: "hidden",
                    }}
                    className="fee-box"
                  >
                    <div
                      style={{
                        fontSize: 14,
                        color: "#92400e",
                        marginBottom: 8,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.8px",
                      }}
                    >
                      Promote Model
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: "#78350f",
                        textShadow: "0 2px 4px rgba(120, 53, 15, 0.4)",
                      }}
                    >
                      {promoteFee} ETH
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--yellow-600)",
                        fontWeight: 500,
                        marginTop: 4,
                      }}
                    >
                      7 days
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--yellow-600)",
                    textAlign: "center",
                    fontStyle: "italic",
                  }}
                >
                  All fees are paid in ETH and go to the platform treasury
                </div>
              </div>
              <div className="form-actions">
                <button
                  disabled={!isConnected || !publicClient || !factoryAddress}
                  onClick={async () => {
                    try {
                      if (!walletClient) throw new Error("No wallet client");
                      if (!publicClient) throw new Error("No public client");
                      if (!question.trim()) throw new Error("Please enter a model name");
                      const user = getAddress(address as Address);
                      const finalFactory = (factoryAddress || FACTORY_ADDRESS_ENV || "") as string;
                      if (!finalFactory) {
                        throw new Error("Missing factory address. Set VITE_RATING_FACTORY_ADDRESS or open Advanced.");
                      }

                      // ABI for factory
                      const factoryAbi = [
                        {
                          type: "function",
                          name: "createItem",
                          stateMutability: "payable",
                          inputs: [
                            { name: "name", type: "string" },
                            { name: "description", type: "string" },
                            { name: "minScore", type: "uint8" },
                            { name: "maxScore", type: "uint8" },
                          ],
                          outputs: [{ type: "address" }, { type: "uint256" }],
                        },
                      ] as const;

                      // Convert fee to wei
                      const feeInWei = BigInt(Math.floor(parseFloat(creationFee) * 1e18));

                      // Try to simulate to get predicted address, but DO NOT block tx if it fails
                      let predictedAddress: Address | undefined = undefined;
                      try {
                        const sim = await publicClient.simulateContract({
                          account: user,
                          abi: factoryAbi,
                          address: finalFactory as Address,
                          functionName: "createItem",
                          args: [question, "", 1, 5],
                          value: feeInWei,
                        });
                        predictedAddress = (sim.result as unknown as [Address, bigint])[0];
                        setStatus(`Creating item… predicted address: ${predictedAddress}`);
                      } catch {
                        setStatus("Creating item… (simulation skipped)");
                      }

                      // Always open wallet popup to send tx
                      const hash = await walletClient.writeContract({
                        abi: factoryAbi,
                        address: finalFactory as Address,
                        functionName: "createItem",
                        args: [question, "", 1, 5],
                        value: feeInWei,
                      });

                      if (predictedAddress) setRatingItemAddress(predictedAddress);
                      setStatus(`Item creation tx: ${hash}`);
                      setCatalog((arr) => [
                        {
                          name: question,
                          tags: newTags
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                          address: predictedAddress as string,
                        },
                        ...arr,
                      ]);
                      setToast(`Created “${question}” and added to Catalog.`);
                    } catch (e: unknown) {
                      const msg = friendlyError(e);
                      if (msg) setStatus(msg);
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>Create Rating</span>
                    <span
                      style={{
                        background: "var(--yellow-100)",
                        color: "var(--yellow-800)",
                        padding: "2px 8px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {creationFee} ETH
                    </span>
                  </div>
                </button>
                <button
                  className="btn-outline"
                  onClick={() =>
                    alert("Set VITE_RATING_FACTORY_ADDRESS in web/.env or fill address above in Advanced step.")
                  }
                >
                  Advanced
                </button>
              </div>
            </div>
          </div>

          {/* Insights & API Section */}
          {showInsights && (
            <div id="insights-section" className="card" style={{ marginTop: 24 }}>
              <div className="card-header">
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 22,
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    textShadow: "0 4px 8px rgba(245, 158, 11, 0.4)",
                    letterSpacing: "0.5px",
                  }}
                >
                  📊 Insights & Analytics API
                </div>
                <div className="pill">Pro</div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 20,
                  marginTop: 16,
                }}
              >
                {/* Left Column */}
                <div className="insights-column" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Analytics Section */}
                  <div
                    style={{
                      background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                      padding: 20,
                      borderRadius: 12,
                      border: "2px solid #f59e0b",
                      boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        marginBottom: 16,
                        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        textShadow: "0 2px 4px rgba(245, 158, 11, 0.3)",
                      }}
                    >
                      📈 Available Analytics
                    </div>
                    <div
                      className="analytics-grid"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr",
                        gap: 8,
                        fontSize: 13,
                        color: "var(--yellow-700)",
                        lineHeight: 1.6,
                      }}
                    >
                      <div>• Total ratings per model</div>
                      <div>• Average ratings over time</div>
                      <div>• Rating distribution (1-5 stars)</div>
                      <div>• Popular models by category</div>
                      <div>• Rating trends and patterns</div>
                      <div>• Model performance metrics</div>
                    </div>
                  </div>

                  {/* API Key Management */}
                  <div
                    style={{
                      background: "white",
                      padding: 20,
                      borderRadius: 12,
                      border: "2px solid var(--gray-200)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "var(--gray-800)" }}>
                      🔑 API Key Management
                    </div>
                    <div className="form-row">
                      <label>API Key</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="Enter your API key"
                          style={{ flex: 1 }}
                        />
                        <button
                          className="btn-primary"
                          onClick={() => {
                            if (!apiKey) {
                              const newKey = `ai_rating_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                              setApiKey(newKey);
                              setToast(`Generated API key: ${newKey}`);
                            } else {
                              setToast("API key copied to clipboard");
                              navigator.clipboard.writeText(apiKey);
                            }
                          }}
                        >
                          {apiKey ? "Copy" : "Generate"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="insights-column" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* API Endpoint */}
                  <div
                    style={{
                      background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                      padding: 20,
                      borderRadius: 12,
                      border: "2px solid #f59e0b",
                      boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        marginBottom: 16,
                        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        textShadow: "0 2px 4px rgba(245, 158, 11, 0.3)",
                      }}
                    >
                      🌐 API Endpoint
                    </div>
                    <div style={{ fontSize: 12, color: "var(--gray-700)", lineHeight: 1.6 }}>
                      <div style={{ marginBottom: 8 }}>
                        <strong>URL:</strong>
                      </div>
                      <div
                        style={{
                          background: "white",
                          padding: 8,
                          borderRadius: 6,
                          fontFamily: "monospace",
                          fontSize: 11,
                          marginBottom: 8,
                          border: "1px solid var(--gray-200)",
                        }}
                      >
                        GET https://api.ai-rating.com/v1/models/{`{modelId}`}/stats
                      </div>
                      <div style={{ marginBottom: 4 }}>
                        <strong>Headers:</strong>
                      </div>
                      <div
                        style={{
                          background: "white",
                          padding: 8,
                          borderRadius: 6,
                          fontFamily: "monospace",
                          fontSize: 11,
                          border: "1px solid var(--gray-200)",
                        }}
                      >
                        Authorization: Bearer {apiKey || "your_api_key"}
                      </div>
                    </div>
                  </div>

                  {/* Pricing Plans */}
                  <div
                    style={{
                      background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                      padding: 20,
                      borderRadius: 12,
                      border: "2px solid #f59e0b",
                      boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        marginBottom: 16,
                        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        textShadow: "0 2px 4px rgba(245, 158, 11, 0.3)",
                      }}
                    >
                      💰 Pricing Plans
                    </div>
                    <div className="pricing-plans" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                      <div
                        style={{
                          background: "white",
                          padding: 16,
                          border: "2px solid var(--gray-200)",
                          borderRadius: 10,
                          textAlign: "center",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: "var(--gray-800)" }}>
                          Free
                        </div>
                        <div style={{ fontSize: 13, color: "var(--gray-600)", marginBottom: 4 }}>
                          100 requests/month
                        </div>
                        <div style={{ fontSize: 11, color: "var(--gray-500)" }}>Perfect for testing</div>
                      </div>
                      <div
                        style={{
                          background: "white",
                          padding: 16,
                          border: "2px solid var(--yellow-400)",
                          borderRadius: 10,
                          textAlign: "center",
                          boxShadow: "0 4px 12px rgba(251, 191, 36, 0.3)",
                          transform: "scale(1.02)",
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: "var(--yellow-800)" }}>
                          Pro
                        </div>
                        <div style={{ fontSize: 13, color: "var(--yellow-700)", marginBottom: 4 }}>
                          10,000 requests/month
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--yellow-800)" }}>$29/month</div>
                        <div style={{ fontSize: 10, color: "var(--yellow-600)", marginTop: 4 }}>Most Popular</div>
                      </div>
                      <div
                        style={{
                          background: "white",
                          padding: 16,
                          border: "2px solid var(--gray-300)",
                          borderRadius: 10,
                          textAlign: "center",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: "var(--gray-800)" }}>
                          Enterprise
                        </div>
                        <div style={{ fontSize: 13, color: "var(--gray-600)", marginBottom: 4 }}>
                          Unlimited requests
                        </div>
                        <div style={{ fontSize: 11, color: "var(--gray-500)" }}>Contact us</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description at bottom */}
              <div
                style={{
                  fontSize: 16,
                  color: "var(--gray-700)",
                  textAlign: "center",
                  fontWeight: 500,
                  padding: "20px 0",
                  borderTop: "1px solid var(--gray-200)",
                  marginTop: 20,
                }}
              >
                Access aggregated rating data and analytics for your applications
              </div>
            </div>
          )}

          {/* end container */}
        </div>
        {/* end main */}

        {/* Footer Section */}
        <footer
          style={{
            background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fbbf24 100%)",
            borderTop: "2px solid #f59e0b",
            marginTop: 60,
            padding: "40px 0 20px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background Pattern */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                "radial-gradient(circle at 20% 80%, rgba(245, 158, 11, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(217, 119, 6, 0.1) 0%, transparent 50%)",
              pointerEvents: "none",
            }}
          />

          <div className="container">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: 32,
                marginBottom: 32,
              }}
            >
              {/* Brand Section */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 40,
                      height: 40,
                      background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                      borderRadius: "10px",
                      boxShadow: "0 4px 12px rgba(245, 158, 11, 0.4)",
                    }}
                  >
                    <Logo size={24} />
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 900,
                      background: "linear-gradient(135deg, #92400e 0%, #d97706 50%, #f59e0b 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      textShadow: "0 2px 4px rgba(245, 158, 11, 0.3)",
                    }}
                  >
                    TrustVault AI
                  </div>
                </div>
                <p
                  style={{
                    color: "#92400e",
                    fontSize: 14,
                    lineHeight: 1.6,
                    marginBottom: 20,
                    opacity: 0.8,
                  }}
                >
                  TrustVault AI - Enterprise-grade confidential AI model rating platform. Rate models privately with
                  encrypted 1-5 star votes using Zama FHEVM technology.
                </p>

                {/* Social Links */}
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <a
                    href="https://x.com/83mhog"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 36,
                      height: 36,
                      background: "linear-gradient(135deg, #1da1f2 0%, #0d8bd9 100%)",
                      borderRadius: "8px",
                      color: "white",
                      textDecoration: "none",
                      transition: "all 0.3s ease",
                      boxShadow: "0 2px 8px rgba(29, 161, 242, 0.3)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 16px rgba(29, 161, 242, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(29, 161, 242, 0.3)";
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>

                  <a
                    href="https://github.com/83mhpll/AI-Rating-Board-with-FHEVM.git"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 36,
                      height: 36,
                      background: "linear-gradient(135deg, #333 0%, #000 100%)",
                      borderRadius: "8px",
                      color: "white",
                      textDecoration: "none",
                      transition: "all 0.3s ease",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.3)";
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#92400e",
                    marginBottom: 16,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Quick Links
                </h3>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                  }}
                >
                  {[
                    { name: "🏆 Leaderboard", href: "#leaderboard" },
                    { name: "📚 AI Model Catalog", href: "#catalog" },
                    { name: "⭐ Rate AI Models", href: "#rate" },
                    { name: "🚀 Create Rating", href: "#create-item" },
                    { name: "🤖 AI Features", href: "#ai-features" },
                  ].map((link, index) => (
                    <li key={index} style={{ marginBottom: 8 }}>
                      <a
                        href={link.href}
                        style={{
                          color: "#d97706",
                          textDecoration: "none",
                          fontSize: 14,
                          fontWeight: 500,
                          transition: "color 0.3s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "#92400e";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "#d97706";
                        }}
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#92400e",
                    marginBottom: 16,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Resources
                </h3>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                  }}
                >
                  {[
                    { name: "📖 Documentation", href: "#help" },
                    { name: "❓ FAQ", href: "#faq" },
                    { name: "🔧 API Reference", href: "#api" },
                    { name: "💡 Tutorials", href: "#tutorials" },
                    { name: "🆘 Support", href: "#support" },
                  ].map((link, index) => (
                    <li key={index} style={{ marginBottom: 8 }}>
                      <a
                        href={link.href}
                        style={{
                          color: "#d97706",
                          textDecoration: "none",
                          fontSize: 14,
                          fontWeight: 500,
                          transition: "color 0.3s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "#92400e";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "#d97706";
                        }}
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Partners & Technology */}
              <div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#92400e",
                    marginBottom: 16,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Powered By
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <a
                    href="https://www.zama.ai/"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      background: "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(254, 243, 199, 0.1) 100%)",
                      borderRadius: "8px",
                      border: "1px solid rgba(245, 158, 11, 0.2)",
                      textDecoration: "none",
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(254, 243, 199, 0.1) 100%)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      Z
                    </div>
                    <span
                      style={{
                        color: "#92400e",
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      Zama FHEVM
                    </span>
                  </a>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      background: "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(254, 243, 199, 0.1) 100%)",
                      borderRadius: "8px",
                      border: "1px solid rgba(245, 158, 11, 0.2)",
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        background: "linear-gradient(135deg, #627eea 0%, #4f46e5 100%)",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      E
                    </div>
                    <span
                      style={{
                        color: "#92400e",
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      Ethereum Sepolia
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div
              style={{
                borderTop: "1px solid rgba(245, 158, 11, 0.3)",
                paddingTop: 20,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 24,
                  justifyContent: "center",
                  fontSize: 12,
                }}
              >
                <a
                  href="#privacy"
                  style={{
                    color: "#d97706",
                    textDecoration: "none",
                    fontWeight: 500,
                    transition: "color 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#92400e";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#d97706";
                  }}
                >
                  Privacy Policy
                </a>
                <a
                  href="#terms"
                  style={{
                    color: "#d97706",
                    textDecoration: "none",
                    fontWeight: 500,
                    transition: "color 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#92400e";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#d97706";
                  }}
                >
                  Terms of Service
                </a>
                <a
                  href="#license"
                  style={{
                    color: "#d97706",
                    textDecoration: "none",
                    fontWeight: 500,
                    transition: "color 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#92400e";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#d97706";
                  }}
                >
                  License
                </a>
                <a
                  href="#contact"
                  style={{
                    color: "#d97706",
                    textDecoration: "none",
                    fontWeight: 500,
                    transition: "color 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#92400e";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#d97706";
                  }}
                >
                  Contact
                </a>
              </div>

              <div
                style={{
                  color: "#92400e",
                  fontSize: 12,
                  opacity: 0.7,
                  fontWeight: 500,
                }}
              >
                © 2025 TrustVault AI. Built with ❤️ using Zama FHEVM. All rights reserved.
              </div>
            </div>
          </div>
        </footer>

        {/* AI Features Section */}
        {showAiFeatures && (
          <div id="ai-features-section" className="card" style={{ marginTop: 24 }}>
            <div className="card-header">
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 22,
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  textShadow: "0 4px 8px rgba(245, 158, 11, 0.4)",
                  letterSpacing: "0.5px",
                }}
              >
                🤖 AI + FHEVM Integration
              </div>
              <div className="pill">Pro</div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
                marginTop: 16,
              }}
            >
              {/* AI API Key Setup */}
              <div
                style={{
                  background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                  padding: 20,
                  borderRadius: 12,
                  border: "2px solid #f59e0b",
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    marginBottom: 16,
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    textShadow: "0 2px 4px rgba(245, 158, 11, 0.3)",
                  }}
                >
                  🔑 OpenAI API Setup
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      marginBottom: 8,
                      display: "block",
                      color: "#92400e",
                    }}
                  >
                    OpenAI API Key
                  </label>
                  <input
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder="sk-..."
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: 8,
                      border: "2px solid #f59e0b",
                      background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                      fontSize: 14,
                      fontWeight: 500,
                      color: "#000000",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#92400e",
                    lineHeight: 1.4,
                    marginBottom: 16,
                  }}
                >
                  Your API key is stored locally and never shared. Used for AI analysis of encrypted ratings.
                </div>
                <button
                  className="btn-primary"
                  onClick={generateModelRecommendations}
                  disabled={!aiApiKey || isAnalyzing}
                  style={{
                    width: "100%",
                    opacity: !aiApiKey || isAnalyzing ? 0.6 : 1,
                  }}
                >
                  {isAnalyzing ? "🤖 Analyzing..." : "🚀 Generate AI Insights"}
                </button>
              </div>

              {/* AI Analysis Results */}
              <div
                style={{
                  background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                  padding: 20,
                  borderRadius: 12,
                  border: "2px solid #f59e0b",
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    marginBottom: 16,
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    textShadow: "0 2px 4px rgba(245, 158, 11, 0.3)",
                  }}
                >
                  📊 AI Analysis Results
                </div>

                {aiInsights ? (
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: "#92400e" }}>
                    <div style={{ marginBottom: 12, fontWeight: 600 }}>Model: {aiInsights.model}</div>
                    <div style={{ marginBottom: 8 }}>
                      <strong>Insights:</strong> {aiInsights.analysis.insights}
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <strong>Sentiment:</strong> {aiInsights.analysis.sentiment}
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <strong>Confidence:</strong> {aiInsights.analysis.confidence}/10
                    </div>
                    <div style={{ fontSize: 12, color: "#92400e", marginTop: 12 }}>
                      Based on {aiInsights.ratings} encrypted ratings
                    </div>
                  </div>
                ) : aiAnalysis ? (
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: "#92400e" }}>
                    <div style={{ whiteSpace: "pre-wrap" }}>{aiAnalysis}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 14, color: "#92400e", textAlign: "center", padding: "20px 0" }}>
                    Enter your OpenAI API key and click "Generate AI Insights" to see AI-powered analysis of your
                    encrypted rating data.
                  </div>
                )}
              </div>
            </div>

            {/* Revenue Model */}
            <div
              style={{
                marginTop: 20,
                background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                padding: 20,
                borderRadius: 12,
                border: "2px solid #f59e0b",
                boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  marginBottom: 16,
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  textShadow: "0 2px 4px rgba(245, 158, 11, 0.3)",
                }}
              >
                💰 AI + FHEVM Revenue Model
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    background: "white",
                    padding: 16,
                    borderRadius: 8,
                    border: "2px solid #f59e0b",
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#92400e" }}>
                    🔒 AI Analysis Fee
                  </div>
                  <div style={{ fontSize: 14, color: "#92400e" }}>$0.10 per AI analysis of encrypted ratings</div>
                  <div style={{ fontSize: 12, color: "#92400e", marginTop: 4 }}>
                    Revenue: ${aiRevenue.toFixed(2)} | Usage: {aiUsage}
                  </div>
                </div>
                <div
                  style={{
                    background: "white",
                    padding: 16,
                    borderRadius: 8,
                    border: "2px solid #f59e0b",
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#92400e" }}>
                    📈 Premium Insights
                  </div>
                  <div style={{ fontSize: 14, color: "#92400e" }}>$5/month for advanced AI recommendations</div>
                </div>
                <div
                  style={{
                    background: "white",
                    padding: 16,
                    borderRadius: 8,
                    border: "2px solid #f59e0b",
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#92400e" }}>
                    🎯 Custom Models
                  </div>
                  <div style={{ fontSize: 14, color: "#92400e" }}>
                    $50 setup + $0.05 per rating for custom AI models
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Business Solutions Section */}
        {showBusinessSolutions && (
          <div id="business-solutions-section" className="card" style={{ marginTop: 24 }}>
            <div className="card-header">
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 22,
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  textShadow: "0 4px 8px rgba(245, 158, 11, 0.4)",
                  letterSpacing: "0.5px",
                }}
              >
                🏢 AI Business Solutions
              </div>
              <div className="pill">Enterprise</div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
                marginTop: 16,
              }}
            >
              {/* Secure Data Processing */}
              <div
                style={{
                  background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                  padding: 20,
                  borderRadius: 12,
                  border: "2px solid #f59e0b",
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    marginBottom: 16,
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    textShadow: "0 2px 4px rgba(245, 158, 11, 0.3)",
                  }}
                >
                  🔐 Secure Data Processing
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, color: "#92400e", marginBottom: 12 }}>
                    Analyze encrypted business data with AI while maintaining complete privacy using FHEVM.
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                    <button
                      className="btn-primary"
                      onClick={() => processSecureData("Sales Data")}
                      disabled={!aiApiKey || isProcessingData}
                      style={{
                        fontSize: 12,
                        padding: "8px 12px",
                        opacity: !aiApiKey || isProcessingData ? 0.6 : 1,
                      }}
                    >
                      {isProcessingData ? "⏳" : "📊"} Sales Analytics
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => processSecureData("Customer Data")}
                      disabled={!aiApiKey || isProcessingData}
                      style={{
                        fontSize: 12,
                        padding: "8px 12px",
                        opacity: !aiApiKey || isProcessingData ? 0.6 : 1,
                      }}
                    >
                      {isProcessingData ? "⏳" : "👥"} Customer Analytics
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => processSecureData("Financial Data")}
                      disabled={!aiApiKey || isProcessingData}
                      style={{
                        fontSize: 12,
                        padding: "8px 12px",
                        opacity: !aiApiKey || isProcessingData ? 0.6 : 1,
                      }}
                    >
                      {isProcessingData ? "⏳" : "💰"} Financial Analytics
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => processSecureData("Operational Data")}
                      disabled={!aiApiKey || isProcessingData}
                      style={{
                        fontSize: 12,
                        padding: "8px 12px",
                        opacity: !aiApiKey || isProcessingData ? 0.6 : 1,
                      }}
                    >
                      {isProcessingData ? "⏳" : "⚙️"} Operations Analytics
                    </button>
                  </div>
                </div>

                {businessAnalytics && (
                  <div
                    style={{
                      background: "white",
                      padding: 12,
                      borderRadius: 8,
                      border: "1px solid #f59e0b",
                      fontSize: 12,
                      color: "#92400e",
                      maxHeight: "200px",
                      overflowY: "auto",
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>📈 {businessAnalytics.type} Analysis</div>
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
                      {businessAnalytics.insights.substring(0, 300)}...
                    </div>
                  </div>
                )}
              </div>

              {/* Business Automation */}
              <div
                style={{
                  background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                  padding: 20,
                  borderRadius: 12,
                  border: "2px solid #f59e0b",
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    marginBottom: 16,
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    textShadow: "0 2px 4px rgba(245, 158, 11, 0.3)",
                  }}
                >
                  ⚙️ Workflow Automation
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, color: "#92400e", marginBottom: 12 }}>
                    Design automated workflows that process encrypted data while maintaining privacy.
                  </div>

                  <button
                    className="btn-primary"
                    onClick={generateWorkflowAutomation}
                    disabled={!aiApiKey || isProcessingData}
                    style={{
                      width: "100%",
                      fontSize: 14,
                      padding: "12px 16px",
                      opacity: !aiApiKey || isProcessingData ? 0.6 : 1,
                    }}
                  >
                    {isProcessingData ? "⏳ Generating..." : "🚀 Generate Workflow Automation"}
                  </button>
                </div>

                {workflowData.length > 0 && (
                  <div
                    style={{
                      background: "white",
                      padding: 12,
                      borderRadius: 8,
                      border: "1px solid #f59e0b",
                      fontSize: 12,
                      color: "#92400e",
                      maxHeight: "200px",
                      overflowY: "auto",
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      📋 Generated Workflows ({workflowData.length})
                    </div>
                    {workflowData.slice(-2).map((workflow) => (
                      <div
                        key={workflow.id}
                        style={{
                          marginBottom: 8,
                          padding: 8,
                          background: "#fef3c7",
                          borderRadius: 4,
                          fontSize: 11,
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>Workflow #{workflow.id}</div>
                        <div style={{ color: "#92400e", marginTop: 4 }}>{workflow.workflow.substring(0, 100)}...</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Customer Insights */}
            <div
              style={{
                marginTop: 20,
                background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                padding: 20,
                borderRadius: 12,
                border: "2px solid #f59e0b",
                boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  marginBottom: 16,
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  textShadow: "0 2px 4px rgba(245, 158, 11, 0.3)",
                }}
              >
                👥 Privacy-Preserving Customer Insights
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, color: "#92400e", marginBottom: 12 }}>
                  Generate customer insights from encrypted data while maintaining individual privacy using FHEVM.
                </div>

                <button
                  className="btn-primary"
                  onClick={generateCustomerInsights}
                  disabled={!aiApiKey || isProcessingData}
                  style={{
                    width: "100%",
                    fontSize: 14,
                    padding: "12px 16px",
                    opacity: !aiApiKey || isProcessingData ? 0.6 : 1,
                  }}
                >
                  {isProcessingData ? "⏳ Analyzing..." : "🔍 Generate Customer Insights"}
                </button>
              </div>

              {customerInsights && (
                <div
                  style={{
                    background: "white",
                    padding: 16,
                    borderRadius: 8,
                    border: "1px solid #f59e0b",
                    fontSize: 14,
                    color: "#92400e",
                    maxHeight: "300px",
                    overflowY: "auto",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 12 }}>📊 Customer Insights Report</div>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{customerInsights.insights}</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#92400e",
                      marginTop: 12,
                      padding: 8,
                      background: "#fef3c7",
                      borderRadius: 4,
                    }}
                  >
                    🔒 Privacy Level: {customerInsights.privacyLevel} | Data Source: {customerInsights.dataSource}
                  </div>
                </div>
              )}
            </div>

            {/* Revenue Tracking */}
            <div
              style={{
                marginTop: 20,
                background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                padding: 20,
                borderRadius: 12,
                border: "2px solid #f59e0b",
                boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  marginBottom: 16,
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  textShadow: "0 2px 4px rgba(245, 158, 11, 0.3)",
                }}
              >
                💰 Business Solutions Revenue
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    background: "white",
                    padding: 16,
                    borderRadius: 8,
                    border: "2px solid #f59e0b",
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#92400e" }}>
                    📊 Data Analytics
                  </div>
                  <div style={{ fontSize: 14, color: "#92400e" }}>$0.25 per analysis</div>
                  <div style={{ fontSize: 12, color: "#92400e", marginTop: 4 }}>
                    Revenue: ${aiRevenue.toFixed(2)} | Usage: {aiUsage}
                  </div>
                </div>
                <div
                  style={{
                    background: "white",
                    padding: 16,
                    borderRadius: 8,
                    border: "2px solid #f59e0b",
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#92400e" }}>
                    ⚙️ Workflow Automation
                  </div>
                  <div style={{ fontSize: 14, color: "#92400e" }}>$0.50 per workflow</div>
                  <div style={{ fontSize: 12, color: "#92400e", marginTop: 4 }}>
                    Generated: {workflowData.length} workflows
                  </div>
                </div>
                <div
                  style={{
                    background: "white",
                    padding: 16,
                    borderRadius: 8,
                    border: "2px solid #f59e0b",
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#92400e" }}>
                    👥 Customer Insights
                  </div>
                  <div style={{ fontSize: 14, color: "#92400e" }}>$0.75 per analysis</div>
                  <div style={{ fontSize: 12, color: "#92400e", marginTop: 4 }}>
                    Reports: {customerInsights ? 1 : 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      {/* end layout */}
      {toast && (
        <div className="toast" onClick={() => setToast("")}>
          {toast}
        </div>
      )}

      {/* Error Display */}
      {showError && error && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: 20,
            right: 20,
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            color: "white",
            padding: "16px 20px",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(239, 68, 68, 0.4)",
            zIndex: 1001,
            fontSize: 14,
            fontWeight: 600,
            maxWidth: "600px",
            margin: "0 auto",
            wordWrap: "break-word",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            {errorType === "network"
              ? "🌐"
              : errorType === "wallet"
                ? "👛"
                : errorType === "contract"
                  ? "📄"
                  : errorType === "validation"
                    ? "⚠️"
                    : "❌"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
              {errorType === "network"
                ? "Network Error"
                : errorType === "wallet"
                  ? "Wallet Error"
                  : errorType === "contract"
                    ? "Contract Error"
                    : errorType === "validation"
                      ? "Validation Error"
                      : "Error"}
            </div>
            <div>{error}</div>
          </div>
          <button
            onClick={clearError}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              color: "white",
              padding: "4px 8px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
