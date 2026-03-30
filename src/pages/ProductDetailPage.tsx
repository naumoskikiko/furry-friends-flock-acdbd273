import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft, Minus, Plus, ShoppingCart, Store, Star, Heart, Send, Flame, Share2 } from "lucide-react";
import SharePostModal from "@/components/messages/SharePostModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { useProductReviews } from "@/hooks/useProductReviews";
import { useProductVariants } from "@/hooks/useProductVariants";
import { useToast } from "@/hooks/use-toast";
import { PRODUCT_CATEGORIES } from "@/hooks/useBusiness";
import { Input } from "@/components/ui/input";
import ProductImageGallery from "@/components/marketplace/ProductImageGallery";
import ProductImage from "@/components/marketplace/ProductImage";

const fromTable = (table: string) => (supabase as any).from(table);

const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { toggle: toggleWishlist, isWishlisted } = useWishlist();
  const { reviews, avgRating, addReview, myReview } = useProductReviews(id || null);
  const { variants } = useProductVariants(id || null);

  const [product, setProduct] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  // Review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Best seller check
  const [isBestSeller, setIsBestSeller] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data: prod } = await fromTable("products").select("*").eq("id", id).single();
      setProduct(prod);
      if (prod) {
        const { data: biz } = await fromTable("business_profiles")
          .select("id, business_name, category, is_verified, logo_url")
          .eq("id", (prod as any).business_id)
          .single();
        setBusiness(biz);

        const { data: related } = await fromTable("products")
          .select("id, name, price, image_url, category")
          .eq("category", (prod as any).category)
          .neq("id", id)
          .eq("is_active", true)
          .limit(6);
        setRelatedProducts(related || []);

        // Check best seller
        const { count } = await fromTable("order_items")
          .select("*", { count: "exact", head: true })
          .eq("product_id", id);
        setIsBestSeller((count || 0) >= 5);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const activeVariant = variants.find((v) => v.id === selectedVariant);
  const effectivePrice = product ? product.price + (activeVariant?.price_modifier || 0) : 0;

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await addToCart(product.id, quantity);
      toast({ title: "Added to cart!", description: `${quantity}x ${product.name}${activeVariant ? ` (${activeVariant.variant_value})` : ""}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setAdding(false);
  };

  const handleSubmitReview = async () => {
    setSubmittingReview(true);
    try {
      await addReview(reviewRating, reviewComment);
      setReviewComment("");
      toast({ title: "Review submitted!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSubmittingReview(false);
  };

  const inStock = product?.stock === null || product?.stock === undefined || product?.stock > 0;
  const maxQty = product?.stock ?? 99;
  const wishlisted = id ? isWishlisted(id) : false;

  // Group variants by label
  const variantGroups = variants.reduce<Record<string, typeof variants>>((acc, v) => {
    if (!acc[v.variant_label]) acc[v.variant_label] = [];
    acc[v.variant_label].push(v);
    return acc;
  }, {});

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  if (!product) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <span className="text-4xl mb-2">📦</span>
          <p className="text-sm font-semibold">Product not found</p>
          <button onClick={() => navigate("/marketplace")} className="text-xs text-primary mt-2 font-bold">
            Back to Pet Vault
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg pb-56">
        {/* Image Gallery */}
        <div className="relative">
          <ProductImageGallery productId={product.id} mainImageUrl={product.image_url} category={product.category} alt={product.name} />
          <button onClick={() => navigate(-1)} className="absolute top-3 left-3 rounded-full bg-background/80 backdrop-blur-sm p-2 z-10">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="absolute top-3 right-3 flex gap-2 z-10">
            <button onClick={() => setShowShareModal(true)} className="rounded-full bg-background/80 backdrop-blur-sm p-2">
              <Share2 className="h-4 w-4" />
            </button>
            <button onClick={() => id && toggleWishlist(id)} className="rounded-full bg-background/80 backdrop-blur-sm p-2">
              <Heart className={`h-4 w-4 ${wishlisted ? "fill-red-500 text-red-500" : ""}`} />
            </button>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {/* Price & name */}
          <div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-extrabold text-primary">{effectivePrice} MKD</p>
              {activeVariant && activeVariant.price_modifier !== 0 && (
                <span className="text-sm text-muted-foreground line-through">{product.price} MKD</span>
              )}
              {avgRating > 0 && (
                <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-bold">
                  <Star className="h-3 w-3 fill-primary" /> {avgRating.toFixed(1)}
                  <span className="text-muted-foreground font-normal">({reviews.length})</span>
                </span>
              )}
              {isBestSeller && (
                <span className="flex items-center gap-0.5 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <Flame className="h-3 w-3" /> Best Seller
                </span>
              )}
            </div>
            <h1 className="font-display text-xl font-extrabold mt-1">{product.name}</h1>
            {product.stock !== null && product.stock !== undefined && (
              <p className={`text-xs mt-1 font-bold ${
                !inStock ? "text-destructive" : product.stock <= 5 ? "text-amber-600" : "text-muted-foreground font-normal"
              }`}>
                {!inStock ? "Out of stock" : product.stock <= 5 ? `Only ${product.stock} left — order soon!` : `${product.stock} in stock`}
              </p>
            )}
          </div>

          {/* Variants */}
          {Object.keys(variantGroups).length > 0 && (
            <div className="space-y-3">
              {Object.entries(variantGroups).map(([label, vList]) => (
                <div key={label}>
                  <h3 className="text-xs font-bold mb-1.5">{label}</h3>
                  <div className="flex flex-wrap gap-2">
                    {vList.map((v) => (
                      <button key={v.id} onClick={() => setSelectedVariant(selectedVariant === v.id ? null : v.id)}
                        className={`rounded-xl border-2 px-3 py-2 text-xs font-bold transition-all ${
                          selectedVariant === v.id ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground"
                        }`}>
                        {v.variant_value}
                        {v.price_modifier !== 0 && (
                          <span className="text-[10px] ml-1 text-muted-foreground">
                            {v.price_modifier > 0 ? `+${v.price_modifier}` : v.price_modifier} MKD
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Store info */}
          {business && (
            <button onClick={() => navigate(`/store/${business.id}`)}
              className="flex items-center gap-3 rounded-2xl bg-card border border-border p-3 w-full text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-lg overflow-hidden">
                {business.logo_url ? (
                  <img src={business.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{business.business_name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{business.category?.replace("_", " ")}</p>
              </div>
            </button>
          )}

          {/* Description */}
          {product.description && (
            <div>
              <h3 className="text-sm font-bold mb-1">Description</h3>
              <p className="text-sm text-muted-foreground">{product.description}</p>
            </div>
          )}

          {/* Quantity selector */}
          {inStock && (
            <div>
              <h3 className="text-sm font-bold mb-2">Quantity</h3>
              <div className="flex items-center gap-3">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="font-display text-lg font-bold w-8 text-center">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(maxQty, quantity + 1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                  <Plus className="h-4 w-4" />
                </button>
                <span className="text-sm text-muted-foreground ml-2">
                  Total: <span className="font-bold text-foreground">{(effectivePrice * quantity).toLocaleString()} MKD</span>
                </span>
              </div>
            </div>
          )}

          {/* Reviews */}
          <div>
            <h3 className="text-sm font-bold mb-3">Reviews ({reviews.length})</h3>

            {user && !myReview && (
              <div className="rounded-2xl bg-card border border-border p-3 mb-3 space-y-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setReviewRating(star)}>
                      <Star className={`h-5 w-5 ${star <= reviewRating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Write a review..." className="text-xs" />
                  <button onClick={handleSubmitReview} disabled={submittingReview}
                    className="flex h-9 w-9 items-center justify-center rounded-xl petkeep-gradient text-primary-foreground shrink-0">
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {reviews.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No reviews yet. Be the first!</p>
            ) : (
              <div className="space-y-2">
                {reviews.slice(0, 5).map((review) => (
                  <div key={review.id} className="rounded-xl bg-card border border-border p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                        {review.profile?.full_name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{review.profile?.full_name || "User"}</p>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-2.5 w-2.5 ${i < review.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                          ))}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    {review.comment && <p className="text-xs text-muted-foreground mt-1.5">{review.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Related products */}
          {relatedProducts.length > 0 && (
            <div>
              <h3 className="text-sm font-bold mb-2">You might also like</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {relatedProducts.map((rp) => (
                  <div key={rp.id} onClick={() => navigate(`/product/${rp.id}`)}
                    className="min-w-[140px] rounded-2xl bg-card border border-border overflow-hidden shrink-0 petkeep-card-hover cursor-pointer">
                    <ProductImage src={rp.image_url} alt={rp.name} category={rp.category} size="lg" aspectRatio="square" className="rounded-t-2xl" />
                    <div className="p-2">
                      <p className="text-[10px] font-bold truncate">{rp.name}</p>
                      <p className="text-xs font-extrabold text-primary mt-0.5">{rp.price} MKD</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fixed bottom add to cart */}
        {inStock && (
          <div className="fixed left-0 right-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] bg-background/95 backdrop-blur-sm border-t border-border p-4 z-[60]">
            <div className="mx-auto max-w-lg">
              <button onClick={handleAddToCart} disabled={adding}
                className="w-full flex items-center justify-center gap-2 rounded-2xl petkeep-gradient text-primary-foreground py-4 text-sm font-bold disabled:opacity-50">
                <ShoppingCart className="h-4 w-4" />
                {adding ? "Adding..." : `Add to Cart · ${(effectivePrice * quantity).toLocaleString()} MKD`}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ProductDetailPage;
