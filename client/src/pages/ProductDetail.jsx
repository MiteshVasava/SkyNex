import { Link, useParams } from 'react-router-dom';
import {
  Truck,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, assetUrl } from '../api';
import { useApp } from '../context/AppContext';

export default function ProductDetail() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const { add } = useApp();

  useEffect(() => {
    let mounted = true;

    const loadProduct = async () => {
      try {
        const data = await api('/products/' + id);

        if (mounted) {
          setP(data);
        }
      } catch (e) {
        console.error('Failed to load product:', e);

        if (mounted) {
          setP(null);
        }
      }
    };

    loadProduct();

    return () => {
      mounted = false;
    };
  }, [id]);

  if (!p) {
    return (
      <main className="center">
        Loading…
      </main>
    );
  }

  return (
    <main className="page detail">

      <div className="crumb">
        <Link to="/">Home</Link>
        {' › '}
        {p.category}
        {' › '}
        {p.name}
      </div>

      <section className="detail-top">

        <div className="gallery">
          <img
            src={assetUrl(p.images?.[0])}
            alt={p.name}
          />
        </div>

        <div className="info">

          <span className="eyebrow">
            {p.brand}
          </span>

          <h1>{p.name}</h1>

          <p>{p.description}</p>

          <div className="bigprice">
            ₹{p.price.toLocaleString('en-IN')}

            {p.oldPrice > p.price && (
              <>
                <del>
                  ₹{p.oldPrice.toLocaleString('en-IN')}
                </del>

                <em>
                  {p.discount}% OFF
                </em>
              </>
            )}
          </div>

          <span
            className={
              p.stock
                ? 'stock'
                : 'stock out'
            }
          >
            {p.stock
              ? '● In stock'
              : '● Out of stock'}
          </span>

          <div className="actions">

            <button
              className="primary"
              disabled={!p.stock}
              onClick={() => add(p)}
            >
              Add to Cart
            </button>

            <button
              className="secondary"
              disabled={!p.stock}
              onClick={() => {
                add(p);
                location.href = '/cart';
              }}
            >
              Buy Now
            </button>

          </div>

          <div className="mini-trust">

            <span>
              <Truck />
              Free Delivery
            </span>

            <span>
              <ShieldCheck />
              Secure
            </span>

            <span>
              <RotateCcw />
              Easy Returns
            </span>

          </div>

        </div>

      </section>

      <section className="description">

        <div>

          <h2>Overview</h2>

          <p>
            {p.description}
          </p>

          <ul>
            {Object.entries(
              p.specifications || {}
            ).map(([k, v]) => (
              <li key={k}>
                <b>{k}:</b> {v}
              </li>
            ))}
          </ul>

        </div>

      </section>

    </main>
  );
}