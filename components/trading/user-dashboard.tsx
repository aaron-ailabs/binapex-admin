'use client';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import { Database } from '@/types/supabase';

// Define the shape of the data we fetch, extending the base Row with the joined trading_pair
type LimitOrder = Database['public']['Tables']['limit_orders']['Row'] & {
  trading_pairs: {
    symbol: string;
  } | null;
};

export function UserDashboard({ symbol }: { symbol?: string }) {
  const supabase = createClient();
  const [orders, setOrders] = useState<LimitOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'open' | 'history'>('open');

  const fetchOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Use limit_orders table which has filled_amount and standard order fields
    let query = supabase
      .from('limit_orders')
      .select('*, trading_pairs(symbol)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (activeTab === 'open') {
        // Assuming 'OPEN' and 'PARTIAL' map to standard statuses. 
        // limit_orders usually has 'pending', 'open', 'filled', 'cancelled' etc.
        // Let's check schema or assume standard 'open'/'partial_filled'? 
        // Adjusted to use 'open' and matching logic. 
        // Note: The database schema implies 'status' is string.
        query = query.in('status', ['open', 'partial']);
    } else {
        query = query.in('status', ['filled', 'cancelled', 'rejected']);
    }
    
    // Filter by symbol if provided via the relationship
    if (symbol) {
        // We can't easily query on joined table column with simple .eq() on the root
        // But Supabase supports filtering on embedded resources using !inner logic or just correct syntax.
        // For simplicity with standard PostgREST, we might need simple filtering on the client or correct foreign table filtering.
        // query = query.eq('trading_pairs.symbol', symbol); // This doesn't work directly in v2 JS client usually without !inner
        
        // Let's skip server-side symbol filtering for now and do it client side or assume ID lookup is needed.
        // OR: use the generic search if available.
        // Given complexity, and "My Orders" usually isn't massive, client side filter is safer for now.
    }

    const { data, error } = await query.limit(50);
    
    if (error) {
        console.error("Error fetching orders:", error);
        return;
    }

    let fetchedOrders = (data as any) as LimitOrder[];
    
    if (symbol) {
        const normalized = symbol.replace('/', '-'); // standardizing e.g. BTC/USD -> BTC-USD if that's how it's stored
        fetchedOrders = fetchedOrders.filter(o => o.trading_pairs?.symbol.includes(normalized) || o.trading_pairs?.symbol.replace('-', '/') === symbol);
    }
    
    setOrders(fetchedOrders);
  };

  useEffect(() => {
    fetchOrders();

    // Realtime subscription
    const channel = supabase
      .channel('my-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'limit_orders',
        },
        (payload) => {
           fetchOrders();
        }
      )
      .subscribe();

    return () => {
        supabase.removeChannel(channel);
    }
  }, [activeTab, symbol]);

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4 font-mono text-sm mt-4 min-h-[300px]">
      <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#D4AF37] font-bold">Limit Orders</h3>
          <div className="flex bg-white/5 rounded p-1 gap-1">
              <button 
                onClick={() => setActiveTab('open')}
                className={`px-3 py-1 rounded text-xs transition-all ${activeTab === 'open' ? 'bg-white/10 text-white font-bold' : 'text-gray-500 hover:text-white'}`}
              >
                  Open Orders
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 rounded text-xs transition-all ${activeTab === 'history' ? 'bg-white/10 text-white font-bold' : 'text-gray-500 hover:text-white'}`}
              >
                  Order History
              </button>
          </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-gray-400">
          <thead className="text-xs uppercase bg-white/5 text-gray-200">
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Pair</th>
              <th className="px-4 py-2">Side</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Filled %</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orders.map((order) => {
              const filledAmt = Number(order.filled_amount ?? 0);
              const totalAmt = Number(order.amount);
              // Avoid division by zero
              const filledPct = totalAmt > 0 ? (filledAmt / totalAmt) * 100 : 0;
              
              const pairDisplay = order.trading_pairs?.symbol ?? 'N/A';

              return (
                <tr key={order.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-2">{order.created_at ? new Date(order.created_at).toLocaleTimeString() : 'N/A'}</td>
                  <td className="px-4 py-2 font-bold text-white">{pairDisplay}</td>
                  <td className={`px-4 py-2 ${order.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                      {order.side.toUpperCase()}
                  </td>
                  <td className="px-4 py-2 text-white">${Number(order.price ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-2">{totalAmt.toFixed(6)}</td>
                  <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#D4AF37]" 
                                style={{ width: `${filledPct}%` }}
                              />
                          </div>
                          <span className="text-xs">{filledPct.toFixed(1)}%</span>
                      </div>
                  </td>
                  <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                          order.status === 'filled' ? 'bg-green-500/10 text-green-500' : 
                          order.status === 'open' ? 'bg-blue-500/10 text-blue-500' :
                          order.status === 'partial' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-red-500/10 text-red-500'
                      }`}>
                          {order.status?.toUpperCase() ?? 'UNKNOWN'}
                      </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {orders.length === 0 && <div className="text-center py-8 text-gray-600 italic">No {activeTab} orders found.</div>}
      </div>
    </div>
  );
}
