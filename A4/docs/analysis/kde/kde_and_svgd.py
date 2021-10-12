import torch
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from tqdm import trange
import altair as alt
from scipy.spatial.distance import pdist, squareform
import geopandas as gpd
import requests

torch.set_default_dtype(torch.double)
class RBFKernel():
    def __init__(self, bandwidth=None):
        self.bandwidth = bandwidth

    def get_pairwise_distances(self, X, Y):
        '''
        Compute pairwise Euclidean distances between all pairs of X and Y
        :param self:
        :param X:
        :param Y:
        :return:
        '''
        XX = X.matmul(X.t())
        XY = X.matmul(Y.t())
        YY = Y.matmul(Y.t())

        # # Note: The formula below computes squared euclidean distance
        out = -2 * XY + XX.diag().unsqueeze(1) + YY.diag().unsqueeze(0)
        # Adding some noise to prevent square root of 0. This prevents gradients from being 0
        # The noise also accounts of tiny negative vals
        # out = torch.sqrt(out.double() + 1e-8)
        assert not torch.any(torch.isnan(out))

        return out

    def kernel_eval(self, X, Y):
        '''
        Compute the Gram matrix between X and Y
        :param self:
        :param X:
        :param Y:
        :return:
        '''
        K = self.get_pairwise_distances(X, Y)
        K = K**2 # Use squared distance
        K *= -self.bandwidth
        K = torch.exp(K)
        assert not torch.any((torch.isnan(K))), "Kernel matrix has NaNs!"
        return K

class KDE():
    def __init__(self, kernel, X, kde_bandwidth=None,
                 w=None, normalizer_fn=None):
        self.kernel = kernel
        self.normalizer_fn = normalizer_fn
        if self.normalizer_fn is not None:
            self.X = self.normalizer_fn(X)
        else:
            self.X = X

        if self.kernel.bandwidth is None:
            # use median trick
            self.kernel.bandwidth = self.median_trick()

        self.kde_bandwidth = kde_bandwidth if kde_bandwidth is not None else self.kernel.bandwidth
        self.w = w


    def log_prob(self, x):

        # Get gram matrix
        if self.normalizer_fn is not None:
            lp = self.kernel.kernel_eval(self.normalizer_fn(x), self.X)
        else:
            lp = self.kernel.kernel_eval(x, self.X)
        lp = lp + 1e-10
        # lp = torch.clamp(lp, -1e7, 1e7) + 1e-10
        if self.w is None:
            # simple average
            lp = lp.sum(dim=1)/self.X.shape[0]
        else:
            # weighted average
            lp = lp.matmul(self.w)

        lp = lp*self.kde_bandwidth
        lp = torch.log(lp)
        # lp = torch.clamp(lp, -1e-8, 1e8)
        return lp

    def dlnprob(self, x):
        '''
        Score function of the KDE estimation
        '''
        if torch.is_tensor(x):
            x_ = torch.autograd.Variable(x, requires_grad=True)
        else:
            x_ = torch.autograd.Variable(torch.from_numpy(x), requires_grad=True)
        dlog_p = torch.autograd.grad(
            self.log_prob(x_).sum(),
            x_,
        )[0]

        # dlog_p = torch.clamp(dlog_p, -1e7,1e7)
        return dlog_p

    def median_trick(self):
        '''
        Compute the bandwidth for kernel based on the median trick
        Reference: Section 2.2 in https://arxiv.org/pdf/1707.07269.pdf
        :param X: The data of shape (num_data, dims) or (num_data, dim1, dim2)
        dist_func: The distance function for pairwise distances
        :return:
        '''

        # Get pairwise distances
        dists = self.kernel.get_pairwise_distances(self.X, self.X).reshape(-1)

        # Compute median of the dists
        h = torch.median(dists)

        # Get bandwidth
        nu = torch.sqrt(h / 2.0)

        return nu

def plot_density_contour(log_prob_fn,
                         filename=None,
                         points=None, points_labels=None, points_colors=None):
    max_lat, min_lat = 47.7, 47.5
    max_long, min_long = -122.225, -122.425
    num_x = 100
    num_y = 100
    x = np.linspace(min_lat, max_lat, num_x)
    y = np.linspace(min_long, max_long, num_y)
    x_mesh,y_mesh = np.meshgrid(x,y)
    log_probs = torch.zeros((num_x,num_y))
    for idx in trange(num_x, desc='KDE Progress'):
        for idy in np.arange(num_y):
            log_probs[idx,idy] = log_prob_fn(torch.tensor([x[idx],y[idy]]).reshape(1,-1))
    log_probs = log_probs.reshape(num_x,num_y).T
    probs = torch.exp(log_probs)
    probs = probs/torch.max(probs)
    fig, ax = plt.subplots(1)
    cfax = ax.contourf(x_mesh, y_mesh, probs, cmap='RdBu_r')
    ax.set_ylabel("Longitude")
    ax.set_xlabel("Latitude")
    clb = fig.colorbar(cfax)
    ax.set_title("Estimated Prob Density for {}".format(file_name))

    if points is not None:
        for point, label, color in zip(points, points_labels, points_colors):
            scat = ax.scatter(point[:, 0], point[:, 1],
                              label=label, c=color, alpha=0.5, edgecolors='black')
        plt.legend()
    if file_name is not None:
        fig.savefig('{}_kde_plot.png'.format(file_name))
    else:
        plt.show()


def download_json(geojsonfile):
    '''Downloads geojson'''
    url =  geojsonfile
    resp = requests.get(url)
    return resp.json()

def gen_map_interactive(log_prob_fn, points):
    '''Generates choropleth map'''

    geojsonfile = 'https://raw.githubusercontent.com/seattleio/seattle-boundaries-data/master/data/neighborhoods.geojson'

    # First get the map
    geojson = download_json(geojsonfile)
    gdf = gpd.GeoDataFrame.from_features(geojson)
    gdf['centroid_lat'] = [pt.centroid.x for pt in gdf['geometry']]
    gdf['centroid_long'] = [pt.centroid.y for pt in gdf['geometry']]

    # Only keep some neighborhoods (adhoc zoom in)
    nhood_names_to_keep = ['Belltown', 'Central Business District', 'Minor', 'Broadway',
       'Stevens', 'South Lake Union', 'Laurelhurst', 'Eastlake',
       'First Hill', 'International District', 'Pioneer Square',
       'Westlake', 'Lower Queen Anne', 'University District',
       'Pike-Market', 'Stevens', 'Wallingford', 'Fremont',
       'West Woodland', 'Adams', 'Lawton Park', 'Interbay', 'Lawton Park',
       'Briarcliff', 'Southeast Magnolia', 'North Queen Anne',
       'West Queen Anne', 'East Queen Anne', 'Portage Bay', 'Montlake',
       'Madison Park', 'Harrison - Denny-Blaine', 'Ravenna', 'Bryant',
       'Windermere', 'Roosevelt', 'Green Lake', 'Phinney Ridge',
       'Sunset Hill', 'Loyal Heights', 'Whittier Heights', 'Mann',
       'Madrona', 'Yesler Terrace', 'Atlantic', 'International District',
       'Leschi', 'Industrial District', 'North Beacon Hill',
       'Mount Baker', 'Harbor Island']

    # Get a reduced gdf with just the above neighborhoods
    gdf = gdf.copy().loc[gdf['name'].isin(nhood_names_to_keep)]

    # Get densities from KDE for centroids
    centroids = np.stack([gdf['centroid_long'], gdf['centroid_lat']]).T
    centroids = torch.from_numpy(centroids)
    density = torch.exp(log_prob_fn(centroids))
    density = density / torch.max(density)

    gdf['density'] = density


    slider = alt.binding_range(min=1, max=x_svgd_df['iteration'].max() - 1, step=1,
                               name='Move stations with slider')
    select_iter = alt.selection_single(name='iteration',
                                       bind=slider, init={'iteration': 0}
                                       )

    # Add Base Layer
    base = alt.Chart(gdf).mark_geoshape(
        stroke='black',
        strokeWidth=1
    ).encode(
    ).properties(
        width=400,
        height=400
    )
    # Add Choropleth Layer
    chloro = alt.Chart(gdf).mark_geoshape(
        stroke='black'
    ).encode(
        alt.Color('density',
                  type='quantitative',
                  scale=alt.Scale(scheme='cividis', domain=(0, 1))
                  )
    )

    # Add points on top of the chart
    scatter = alt.Chart(points).mark_circle(color='purple', opacity=0.7, stroke='gray').encode(
        latitude='lat:Q',
        longitude='long:Q',
    ).add_selection(
        select_iter
    ).transform_filter(
        select_iter
    )

    return base + chloro + scatter

class SVGD_model():
    '''
    SVGD code from : https://github.com/chenxy99/Stein-Variational-Gradient-Descent
    '''
    def __init__(self):
        pass

    def SVGD_kernal(self, x, h=-1):
        init_dist = pdist(x)
        pairwise_dists = squareform(init_dist)
        if h < 0:  # if h < 0, using median trick
            h = np.median(pairwise_dists)
            h = h ** 2 / np.log(x.shape[0] + 1)

        kernal_xj_xi = np.exp(- pairwise_dists ** 2 / h)
        d_kernal_xi = np.zeros(x.shape)
        for i_index in range(x.shape[0]):
            d_kernal_xi[i_index] = np.matmul(kernal_xj_xi[i_index], x[i_index] - x) * 2 / h

        return kernal_xj_xi, d_kernal_xi

    def update(self, x0, lnprob, n_iter=1000, stepsize=1e-3, bandwidth=-1, alpha=0.9, debug=False):
        # Check input
        if x0 is None or lnprob is None:
            raise ValueError('x0 or lnprob cannot be None!')

        x = np.copy(x0)
        x_list = np.expand_dims(np.zeros_like(x),0).repeat(n_iter,0)
        x_list[0,:] = x

        # adagrad with momentum
        eps_factor = 1e-8
        historical_grad_square = 0
        for iter in trange(n_iter, desc='SVGD Progress'):
            if debug and (iter + 1) % 1000 == 0:
                print('iter ' + str(iter + 1))

            kernal_xj_xi, d_kernal_xi = self.SVGD_kernal(x, h=bandwidth)
            # Adding 1.5 scale to amp up the repulsive force
            current_grad = (np.matmul(kernal_xj_xi, lnprob(x)) + 1.5*d_kernal_xi) / x.shape[0]

            if iter == 0:
                historical_grad_square += current_grad ** 2
            else:
                historical_grad_square = alpha * historical_grad_square + (1 - alpha) * (current_grad ** 2)
            adj_grad = current_grad / np.sqrt(historical_grad_square + eps_factor)
            x += stepsize * adj_grad
            x_list[iter, :] = x

        return x, x_list


if __name__ == "__main__":
    # Load data
    file_name = 'dockless_end_aggregated'

    max_lat, min_lat = 47.7, 47.5
    max_long, min_long = -122.225, -122.425
    kde_bandwidth = 1e-5
    kde_normalizer = 1e-3
    svgd_iters = 70
    svgd_step_size = 1e-3
    svgd_bandwidth = 5e-5


    if file_name == 'dockless_end_aggregated':
        data = pd.read_csv('../../data/seattle/{}.csv'.format(file_name),
                           usecols=['lat', 'long', 'TripCount'])
        data = data.loc[((data['lat'] < max_lat) & (data['lat'] > min_lat)), :]
        data = data.loc[((data['long'] < max_long) & (data['long'] > min_long)), :]
        weights = torch.from_numpy(np.array(data['TripCount']/data['TripCount'].sum()))
        data = torch.from_numpy(np.array(data[['lat', 'long']]))
    else:
        data = pd.read_csv('../../data/seattle/{}.csv'.format(file_name),
                           usecols=['lat', 'long'])
        data = data.loc[((data['lat'] < max_lat) & (data['lat'] > min_lat)), :]
        data = data.loc[((data['long'] < max_long) & (data['long'] > min_long)), :]
        data = torch.from_numpy(np.array(data))
        weights = torch.ones(data.shape[0]) / data.shape[0]
        weights = weights / weights.sum()


    # Get pronto stations for reference
    pronto_stations = pd.read_csv('../../data/pronto/station.csv',
                                  usecols=['lat', 'long'])
    pronto_stations = torch.from_numpy(np.array(pronto_stations))


    # Train a KDE model for stations
    kernel = RBFKernel(bandwidth=kde_bandwidth)
    def normalizer(x): return x/kde_normalizer
    kde = KDE(kernel, data, w=weights,normalizer_fn=normalizer)
    plot_density_contour(kde.log_prob,
                         filename='{}_kde_plot.png'.format(file_name),
                         points=[pronto_stations, data],
                         points_labels=['Pronto Stations', file_name],
                         points_colors=['gray','green'])

    # Run SVGD
    svgd_model = SVGD_model()
    x0 = pronto_stations  # Start at pronto locations

    def score_fn(x):
        return kde.dlnprob(torch.from_numpy(x)).numpy()

    x = x0
    n_iters = svgd_iters
    x_svgd, x_svgd_list = svgd_model.update(x, score_fn, n_iter=n_iters,
                                            stepsize=svgd_step_size, bandwidth=svgd_bandwidth,
                                            alpha=0.9, debug=False)

    x_svgd_df = pd.DataFrame(columns=['iteration', 'sample_num', 'lat', 'long'])
    for idx in np.arange(x_svgd_list.shape[0]):
        iter_df = pd.DataFrame({
            'iteration': np.ones(x_svgd_list.shape[1]) * idx,
            'sample_num': np.arange(0, x_svgd_list.shape[1]),
            'lat': x_svgd_list[idx, :, 0],
            'long': x_svgd_list[idx, :, 1]
        })
        x_svgd_df = x_svgd_df.append(iter_df)
    x_svgd_df['iteration'] = x_svgd_df['iteration'].astype(np.int)

    # Save svgd as json
    alt.to_json(x_svgd_df, filename='{}_svgd.json'.format(file_name))

    # Plot interactive heat map with SVGD points
    chart = gen_map_interactive(kde.log_prob, x_svgd_df)


    chart = chart.configure_view(strokeOpacity=0)
    chart.save('{}_svgd_chart.html'.format(file_name))